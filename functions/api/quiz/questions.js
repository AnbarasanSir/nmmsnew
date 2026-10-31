export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const subject = url.searchParams.get('subject');
    const unit = url.searchParams.get('unit');
    const count = url.searchParams.get('count');
    const shuffle = url.searchParams.get('shuffle');

    if (!subject || !unit) {
        return new Response(JSON.stringify({ success: false, error: 'Missing subject or unit parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Clean unit name to prevent path traversal
    const cleanUnit = unit.replace(/^.*[\\\/]/, '').replace(/\.json$/, '');
    const assetUrl = new URL(`/assets/${subject}/data/${cleanUnit}.json`, request.url);

    let rawQuestions;
    try {
        const assetRes = await env.ASSETS.fetch(new Request(assetUrl, {
            headers: { 'x-internal-secret': 'NMMS_SECURE_INTERNAL_ASSET_ACCESS' }
        }));
        if (!assetRes.ok) {
            return new Response(JSON.stringify({ success: false, error: 'Unit not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        rawQuestions = await assetRes.json();
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to load unit data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let questions = [...rawQuestions];
    if (shuffle === 'true') {
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
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

    return new Response(JSON.stringify({
        success: true,
        subject,
        unit: cleanUnit,
        totalCount: sanitized.length,
        questions: sanitized
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

