export async function onRequest(context) {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // Allow internal requests from our own API functions
    const internalSecret = context.request.headers.get('x-internal-secret');
    if (internalSecret === 'NMMS_SECURE_INTERNAL_ASSET_ACCESS') {
        return context.next();
    }

    // Security Gate: Block direct external browser access to raw question files or bundles
    if (path.includes('/data/') || path.startsWith('/js/data/')) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Access Denied: Direct file download of question database is strictly prohibited.'
        }), {
            status: 403,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    }

    return context.next();
}

