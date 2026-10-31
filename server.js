const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp'
};

// In-memory cache for questions master data (fast response time)
const dataCache = new Map();
const VALID_SUBJECTS = new Set(['matquiz', 'pyq', 'satmaths', 'satscience', 'satsocial']);

function getUnitData(subject, unit) {
    if (!VALID_SUBJECTS.has(subject)) return null;

    // Sanitize unit name: remove directory separators and extension
    const cleanUnit = path.basename(unit, '.json');
    const cacheKey = `${subject}:${cleanUnit}`;

    if (dataCache.has(cacheKey)) {
        return dataCache.get(cacheKey);
    }

    const filePath = path.join(ROOT_DIR, 'assets', subject, 'data', `${cleanUnit}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(raw)) {
            dataCache.set(cacheKey, raw);
            return raw;
        }
    } catch (err) {
        console.error(`[Server] Error parsing ${filePath}:`, err);
    }
    return null;
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // 5MB safeguard limit
            if (body.length > 5 * 1024 * 1024) {
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    const host = req.headers.host || `localhost:${PORT}`;
    const reqUrlObj = new URL(req.url, `http://${host}`);
    const pathname = decodeURI(reqUrlObj.pathname);
    const query = Object.fromEntries(reqUrlObj.searchParams);

    // ==============================================================
    // SECURE API ROUTES (Answers & Explanations are NEVER sent raw)
    // ==============================================================

    // 1. GET /api/quiz/questions
    if (req.method === 'GET' && pathname === '/api/quiz/questions') {
        const { subject, unit, count, shuffle } = query;
        if (!subject || !unit) {
            return sendJson(res, 400, { success: false, error: 'Missing subject or unit parameter' });
        }

        const rawQuestions = getUnitData(subject, unit);
        if (!rawQuestions) {
            return sendJson(res, 404, { success: false, error: 'Questions not found for the requested unit' });
        }

        let questions = rawQuestions;
        if (shuffle === 'true' || shuffle === true) {
            questions = shuffleArray(questions);
        }

        const limit = parseInt(count, 10);
        if (!isNaN(limit) && limit > 0 && limit < questions.length) {
            questions = questions.slice(0, limit);
        }

        // STRIP correct answers and explanations before sending to client
        const sanitized = questions.map((q, idx) => ({
            id: q.id || (idx + 1),
            question: q.question || q.question_en || '',
            question_en: q.question_en || q.question || '',
            options: Array.isArray(q.options) ? q.options : [],
            options_en: Array.isArray(q.options_en) ? q.options_en : [],
            image: q.image || null
        }));

        return sendJson(res, 200, {
            success: true,
            subject,
            unit: path.basename(unit, '.json'),
            totalCount: sanitized.length,
            questions: sanitized
        });
    }

    // 2. POST /api/quiz/check (Practice Mode - verifies single answer)
    if (req.method === 'POST' && pathname === '/api/quiz/check') {
        try {
            const body = await parseJsonBody(req);
            const { subject, unit, questionId, selectedOptionIndex } = body;

            if (!subject || !unit || questionId === undefined || selectedOptionIndex === undefined) {
                return sendJson(res, 400, { success: false, error: 'Invalid check request parameters' });
            }

            const rawQuestions = getUnitData(subject, unit);
            if (!rawQuestions) {
                return sendJson(res, 404, { success: false, error: 'Unit data not found' });
            }

            const q = rawQuestions.find(item => Number(item.id) === Number(questionId));
            if (!q) {
                return sendJson(res, 404, { success: false, error: 'Question not found' });
            }

            let correctIdx = typeof q.correct === 'number' ? q.correct : 0;
            const optionsLen = Array.isArray(q.options) ? q.options.length : 4;
            if (correctIdx >= optionsLen && optionsLen > 0) {
                correctIdx = optionsLen - 1;
            }

            const isCorrect = Number(selectedOptionIndex) === correctIdx;

            // Send verification only AFTER user submits their answer
            return sendJson(res, 200, {
                success: true,
                questionId: q.id,
                isCorrect: isCorrect,
                correctIndex: correctIdx,
                explanation: q.explanation || q.explanation_en || '',
                explanation_en: q.explanation_en || q.explanation || '',
                explanationImage: q.explanationImage || null
            });
        } catch (err) {
            console.error('[Server] Check answer error:', err);
            return sendJson(res, 500, { success: false, error: 'Internal server error checking answer' });
        }
    }

    // 3. POST /api/quiz/submit (Exam Mode - validates full exam and produces score & solutions)
    if (req.method === 'POST' && pathname === '/api/quiz/submit') {
        try {
            const body = await parseJsonBody(req);
            const { subject, unit, answers = {}, questionIds = [] } = body;

            if (!subject || !unit || !Array.isArray(questionIds)) {
                return sendJson(res, 400, { success: false, error: 'Invalid submit request parameters' });
            }

            const rawQuestions = getUnitData(subject, unit);
            if (!rawQuestions) {
                return sendJson(res, 404, { success: false, error: 'Unit data not found' });
            }

            const qMap = new Map();
            rawQuestions.forEach(q => qMap.set(Number(q.id), q));

            let correctCount = 0;
            let wrongCount = 0;
            let unattemptedCount = 0;
            const review = [];

            for (const qId of questionIds) {
                const q = qMap.get(Number(qId));
                if (!q) continue;

                let correctIdx = typeof q.correct === 'number' ? q.correct : 0;
                const optionsLen = Array.isArray(q.options) ? q.options.length : 4;
                if (correctIdx >= optionsLen && optionsLen > 0) {
                    correctIdx = optionsLen - 1;
                }

                const userAns = answers[qId];
                const hasAnswered = userAns !== undefined && userAns !== null && userAns !== -1;
                const isCorrect = hasAnswered && Number(userAns) === correctIdx;

                if (!hasAnswered) {
                    unattemptedCount++;
                } else if (isCorrect) {
                    correctCount++;
                } else {
                    wrongCount++;
                }

                review.push({
                    id: q.id,
                    selectedOptionIndex: hasAnswered ? Number(userAns) : null,
                    isCorrect: isCorrect,
                    correctIndex: correctIdx,
                    explanation: q.explanation || q.explanation_en || '',
                    explanation_en: q.explanation_en || q.explanation || '',
                    explanationImage: q.explanationImage || null
                });
            }

            const total = review.length;
            const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
            const accuracy = (correctCount + wrongCount) > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

            return sendJson(res, 200, {
                success: true,
                results: {
                    totalQuestions: total,
                    correctCount,
                    wrongCount,
                    unattemptedCount,
                    percentage,
                    accuracy,
                    review
                }
            });
        } catch (err) {
            console.error('[Server] Submit exam error:', err);
            return sendJson(res, 500, { success: false, error: 'Internal server error calculating results' });
        }
    }

    // ==============================================================
    // SECURITY GATE: BLOCK DIRECT ACCESS TO RAW QUESTION DATA & BUNDLES
    // ==============================================================
    if (pathname.includes('/data/') || pathname.startsWith('/js/data/')) {
        return sendJson(res, 403, {
            success: false,
            error: 'Access Denied: Direct file download of question database is strictly prohibited.'
        });
    }

    // ==============================================================
    // STATIC FILE SERVING (HTML, CSS, JS, Images, Fonts)
    // ==============================================================
    let reqUrl = pathname;
    if (reqUrl === '/') reqUrl = '/index.html';

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(ROOT_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + reqUrl);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': ext === '.png' || ext === '.woff2' || ext === '.jpg' ? 'public, max-age=86400' : 'no-cache'
        });

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🔒 NMMS Quiz Portal - Secure API & App Server Running`);
    console.log(`👉 Open in your browser: http://localhost:${PORT}`);
    console.log(`🛡️ Direct question downloads are BLOCKED (403 Forbidden)`);
    console.log(`⚡ API Endpoints active: /api/quiz/*`);
    console.log(`======================================================\n`);
});
