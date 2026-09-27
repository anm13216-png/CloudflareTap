import { createJWT, validateJWT } from '../utils/jwt.js';
import { timingSafeStringEqual } from '../utils/crypto.js';
import { corsHeaders, jsonResponse } from '../utils/response.js';

// ---------- Key Generation（Token 吊销） ----------
let _genCache = { value: null, expireAt: 0 };

export async function currentKeyGen(env) {
    const now = Date.now();
    if (_genCache.value !== null && _genCache.expireAt > now) return _genCache.value;
    let gen = '1';
    try { gen = (await env.CARD_ORDER.get('__keygen__', 'text')) || '1'; } catch {}
    _genCache = { value: gen, expireAt: now + 60_000 };
    return gen;
}

export async function bumpKeyGen(env) {
    try {
        let gen = parseInt((await env.CARD_ORDER.get('__keygen__', 'text')) || '1', 10);
        gen = String(gen + 1);
        _genCache = { value: gen, expireAt: Date.now() + 60_000 };
        await env.CARD_ORDER.put('__keygen__', gen);
        return gen;
    } catch (e) {
        console.warn('keygen bump failed', e);
        return null;
    }
}

// ---------- Cookie 解析 ----------
export function parseCookie(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        cookies[name] = decodeURIComponent(value);
    });
    return cookies;
}

// ---------- Token 验证 ----------
export async function validateServerToken(authHeader, env) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { isValid: false, status: 401, response: { error: 'Unauthorized', message: '未登录' } };
    }
    const token = authHeader.slice(7);

    const payload = await validateJWT(token, env.JWT_SECRET);

    if (!payload) {
        return { isValid: false, status: 401, response: { error: 'Invalid', message: 'Token无效' } };
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
        return { isValid: false, status: 401, response: { error: 'Expired', message: 'Token过期' } };
    }

    if (payload.type !== 'access') {
        return { isValid: false, status: 401, response: { error: 'WrongType', message: 'Token类型错误' } };
    }

    const gen = await currentKeyGen(env);
    if (!payload.kid || payload.kid !== gen) {
        return { isValid: false, status: 401, response: { error: 'Revoked', message: 'Token已吊销' } };
    }

    return { isValid: true, payload };
}

// ---------- 登录处理（用户名+密码） ----------
export async function handleLogin(request, env) {
    const RATE_LIMIT_PREFIX = '__limit__';
    const MAX_ATTEMPTS = 5;
    const LOCK_MS = 900 * 1000;
    try {
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateLimitKey = `${RATE_LIMIT_PREFIX}login_${clientIP}`;
        const kv = await env.CARD_ORDER.getWithMetadata(rateLimitKey, { type: 'text' });
        const attempts = parseInt(kv.value) || 0;
        const expiredAt = (kv.metadata && kv.metadata.expiredAt) || 0;

        if (attempts >= MAX_ATTEMPTS) {
            const waitSec = Math.max(1, Math.ceil((expiredAt - Date.now()) / 1000));
            return jsonResponse({ valid: false, locked: true, remaining: 0, retryAfter: waitSec }, 429, request, env);
        }

        const { username, password } = await request.json();

        // 同时校验用户名和密码（恒定时间比较），统一返回"用户名或密码错误"
        const expectedUsername = env.ADMIN_USERNAME || 'admin';
        const usernameOk = typeof username === 'string' && (await timingSafeStringEqual(username, expectedUsername));
        const passwordOk = typeof password === 'string' && (await timingSafeStringEqual(password, env.ADMIN_PASSWORD));
        const loginOk = usernameOk && passwordOk;

        if (!loginOk) {
            const newAttempts = attempts + 1;
            const newExpiredAt = Date.now() + LOCK_MS;
            await env.CARD_ORDER.put(rateLimitKey, String(newAttempts), { expirationTtl: 900, metadata: { expiredAt: newExpiredAt } });
            const remaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
            if (newAttempts >= MAX_ATTEMPTS) {
                return jsonResponse({ valid: false, locked: true, remaining: 0, retryAfter: Math.max(1, Math.ceil((newExpiredAt - Date.now()) / 1000)) }, 429, request, env);
            }
            return jsonResponse({ valid: false, remaining }, 403, request, env);
        }
        await env.CARD_ORDER.delete(rateLimitKey);

        const currentTime = Math.floor(Date.now() / 1000);
        const kid = await currentKeyGen(env);

        const accessTokenPayload = {
            iat: currentTime,
            exp: currentTime + 7200,
            role: 'admin',
            type: 'access',
            kid
        };
        const accessToken = await createJWT(accessTokenPayload, env.JWT_SECRET);

        const refreshTokenPayload = {
            iat: currentTime,
            exp: currentTime + 2592000,
            role: 'admin',
            type: 'refresh',
            kid
        };
        const refreshToken = await createJWT(refreshTokenPayload, env.JWT_SECRET);

        const response = jsonResponse({ valid: true, token: `Bearer ${accessToken}` }, 200, request, env);
        response.headers.append('Set-Cookie', `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/refreshToken; Max-Age=2592000`);

        return response;
    } catch (e) {
        return jsonResponse({ valid: false, error: 'Auth failed' }, 403, request, env);
    }
}

// ---------- Token 刷新 ----------
export async function handleRefreshToken(request, env) {
    try {
        const cookies = parseCookie(request.headers.get('Cookie'));
        const refreshToken = cookies.refreshToken;

        if (!refreshToken) {
            return jsonResponse({ error: 'Refresh token missing' }, 401, request, env);
        }

        const payload = await validateJWT(refreshToken, env.JWT_SECRET);
        const currentTime = Math.floor(Date.now() / 1000);

        if (!payload || payload.exp < currentTime) {
            return jsonResponse({ error: 'Refresh token expired' }, 401, request, env);
        }

        if (payload.type !== 'refresh') {
            return jsonResponse({ error: 'Invalid token type' }, 400, request, env);
        }

        const kid = await currentKeyGen(env);
        if (!payload.kid || payload.kid !== kid) {
            return jsonResponse({ error: 'Refresh token revoked' }, 401, request, env);
        }

        const newAccessTokenPayload = {
            iat: currentTime,
            exp: currentTime + 7200,
            role: 'admin',
            type: 'access',
            kid
        };
        const newAccessToken = await createJWT(newAccessTokenPayload, env.JWT_SECRET);

        const newRefreshTokenPayload = {
            iat: currentTime,
            exp: currentTime + 2592000,
            role: 'admin',
            type: 'refresh',
            kid
        };
        const newRefreshToken = await createJWT(newRefreshTokenPayload, env.JWT_SECRET);

        const response = jsonResponse({ accessToken: `Bearer ${newAccessToken}` }, 200, request, env);
        response.headers.append('Set-Cookie', `refreshToken=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/refreshToken; Max-Age=2592000`);

        return response;
    } catch (e) {
        return jsonResponse({ error: 'Internal server error' }, 500, request, env);
    }
}

// ---------- Token 验证接口 ----------
export async function handleValidateToken(request, env) {
    const validation = await validateServerToken(request.headers.get('Authorization'), env);
    return jsonResponse(
        validation.isValid ? { valid: true } : validation.response,
        validation.status || 200,
        request,
        env
    );
}

// ---------- 登出 ----------
export async function handleLogout(request, env) {
    await bumpKeyGen(env);
    const response = jsonResponse({ success: true }, 200, request, env);
    response.headers.append('Set-Cookie', 'refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/refreshToken; Max-Age=0');
    return response;
}