export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        const { subject, unit, questionId, selectedOptionIndex } = body;

        if (!subject || !unit || questionId === undefined || selectedOptionIndex === undefined) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid check request parameters' }), {
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
        const q = rawQuestions.find(item => Number(item.id) === Number(questionId));
        if (!q) {
            return new Response(JSON.stringify({ success: false, error: 'Question not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let correctIdx = typeof q.correct === 'number' ? q.correct : 0;
        const optionsLen = Array.isArray(q.options) ? q.options.length : 4;
        if (correctIdx >= optionsLen && optionsLen > 0) {
            correctIdx = optionsLen - 1;
        }

        const isCorrect = Number(selectedOptionIndex) === correctIdx;

        // Send verification only AFTER user attempts the question
        return new Response(JSON.stringify({
            success: true,
            questionId: q.id,
            isCorrect: isCorrect,
            correctIndex: correctIdx,
            explanation: q.explanation || q.explanation_en || '',
            explanation_en: q.explanation_en || q.explanation || '',
            explanationImage: q.explanationImage || null
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Error checking answer' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

