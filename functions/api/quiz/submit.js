export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const { subject, unit, answers = {}, questionIds = [] } = body;

        if (!subject || !unit || !Array.isArray(questionIds)) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid submit request parameters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cleanUnit = unit.replace(/^.*[\\\/]/, '').replace(/\.json$/, '');
        const assetUrl = new URL(`/assets/${subject}/data/${cleanUnit}.json`, request.url);

        const assetRes = await env.ASSETS.fetch(new Request(assetUrl, {
            headers: { 'x-internal-secret': 'NMMS_SECURE_INTERNAL_ASSET_ACCESS' }
        }));
        if (!assetRes.ok) {
            return new Response(JSON.stringify({ success: false, error: 'Unit not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const rawQuestions = await assetRes.json();
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

        return new Response(JSON.stringify({
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
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Error submitting exam' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

