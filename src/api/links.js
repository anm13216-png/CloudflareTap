import { validateServerToken } from './auth.js';
import { handleSmartBackup } from './backup.js';
import { corsHeaders, jsonResponse } from '../utils/response.js';
import { readLinksKv, filterPublic, readJsonBody } from '../utils/kv.js';
import { getDefaultUser } from '../utils/config.js';
import { getDataRev, bumpRev, cacheKeyFor, sendCached, CACHE, ctxSafePut } from '../utils/cache.js';
import { validateCategories, sanitizeCategories } from '../utils/validate.js';

// ---------- 获取书签 ----------
export async function handleGetLinks(request, env, ctx) {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');

    let scope = 'anon';
    if (authHeader) {
        const v = await validateServerToken(authHeader, env);
        if (v.isValid) scope = 'authed';
    }

    const rev = scope === 'anon' ? await getDataRev(env) : '0';
    const cacheKey = cacheKeyFor(url, rev, scope);

    // 边缘缓存命中 → 0 KV 读
    if (scope === 'anon') {
        const hit = await CACHE.match(cacheKey);
        if (hit) {
            const r = new Response(hit.body, hit);
            r.headers.set('X-KV-Cache', 'HIT');
            return r;
        }
    }

    const data = await readLinksKv(env);

    if (data && data.categories) {
        for (const name in data.categories) {
            const cat = data.categories[name];
            if (cat && Array.isArray(cat.links)) {
                for (const l of cat.links) {
                    if (l.category === undefined || l.category === null) l.category = name;
                }
            }
        }
    }

    if (scope === 'authed') {
        return sendCached(JSON.stringify(data), request, cacheKey, false, corsHeaders(request, env));
    }

    const publicData = data ? { categories: filterPublic(data.categories) } : { categories: {} };
    return sendCached(JSON.stringify(publicData), request, cacheKey, true, corsHeaders(request, env));
}

// ---------- 保存数据 ----------
export async function handleSaveData(request, env, ctx) {
    const validation = await validateServerToken(request.headers.get('Authorization'), env);
    if (!validation.isValid) return jsonResponse(validation.response, validation.status, request, env);

    const body = await readJsonBody(request);
    if (!body.ok) return jsonResponse({ error: body.reason }, body.reason === 'TOO_LARGE' ? 413 : 400, request, env);

    const categories = body.data.categories || {};
    const check = validateCategories(categories);
    if (!check.ok) return jsonResponse({ error: 'INVALID_DATA', detail: check.reason }, 422, request, env);

    const DEFAULT_USER = getDefaultUser();

    // 智能备份（异步，不阻塞主请求）
    const currentData = await env.CARD_ORDER.get(DEFAULT_USER);
    if (currentData) {
        ctx.waitUntil(handleSmartBackup(env, currentData));
    }

    await env.CARD_ORDER.put(DEFAULT_USER, JSON.stringify({ categories: sanitizeCategories(categories) }));
    const rev = await bumpRev(env);
    return jsonResponse({ success: true, rev }, 200, request, env);
}