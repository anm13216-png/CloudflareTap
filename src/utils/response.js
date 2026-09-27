export function corsHeaders(request, env) {
    const list = env && env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').filter(Boolean) : [];
    const origin = request ? request.headers.get('Origin') : null;
    if (!origin || !list.includes(origin)) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
    };
}

export function jsonResponse(body, status, request, env, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders(request, env),
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    });
}

export function assertEnv(env) {
    const messages = [];
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
        messages.push('JWT_SECRET 未配置或强度不足（需 ≥32 字符）');
    }
    if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 8) {
        messages.push('ADMIN_PASSWORD 未配置或过短');
    }
    if (messages.length > 0) {
        const e = new Error(`FATAL: 配置缺失或无效: ${messages.join('; ')}`);
        e.code = 'CONFIG_ERROR';
        e.messages = messages;
        throw e;
    }
}