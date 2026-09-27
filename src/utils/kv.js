import { getDefaultUser } from './config.js';

const EMPTY_DATA = { categories: {} };

export function safeJsonParse(text, fallback) {
    if (typeof text !== 'string' || text === '') return { ok: false, data: fallback };
    try {
        const v = JSON.parse(text);
        if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, data: fallback };
        return { ok: true, data: v };
    } catch (e) {
        return { ok: false, data: fallback };
    }
}

export function normalizeCategories(categories) {
    for (const key in categories) {
        if (Array.isArray(categories[key])) {
            categories[key] = { isHidden: false, links: categories[key] };
        }
    }
    return categories;
}

export async function readLinksKv(env) {
    const DEFAULT_USER = getDefaultUser();
    let dataStr = null;
    try {
        dataStr = await env.CARD_ORDER.get(DEFAULT_USER);
    } catch (e) {
        console.error('KV read failed:', e);
    }
    const { data } = safeJsonParse(dataStr, EMPTY_DATA);
    if (data) data.categories = normalizeCategories(data.categories || {});
    return data;
}

export function filterPublic(categories) {
    const out = {};
    for (const name in categories) {
        const cat = categories[name];
        if (cat && cat.isHidden) continue;
        const publicLinks = (cat && Array.isArray(cat.links) ? cat.links : []).filter(l => !l.isPrivate);
        if (publicLinks.length > 0) out[name] = { ...(cat || {}), links: publicLinks };
    }
    return out;
}

export async function readJsonBody(request, maxBytes = 8 * 1024 * 1024) {
    const len = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (len > maxBytes) return { ok: false, reason: 'TOO_LARGE' };
    const text = await request.text();
    if (text.length > maxBytes) return { ok: false, reason: 'TOO_LARGE' };
    try { return { ok: true, data: JSON.parse(text) }; }
    catch { return { ok: false, reason: 'BAD_JSON' }; }
}

export { EMPTY_DATA };