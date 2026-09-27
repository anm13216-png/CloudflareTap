import { base64UrlEncodeUint8 } from './jwt.js';

const CACHE = caches.default;
let _revCache = { value: null, expireAt: 0 };

export async function getDataRev(env) {
    const now = Date.now();
    if (_revCache.value !== null && _revCache.expireAt > now) return _revCache.value;
    let rev = '0';
    try {
        rev = (await env.CARD_ORDER.get('__rev__', 'text')) || '0';
    } catch (e) { console.warn('rev read failed:', e); }
    _revCache = { value: rev, expireAt: now + 60_000 };
    return rev;
}

export async function bumpRev(env) {
    const rev = String(Date.now());
    _revCache = { value: rev, expireAt: Date.now() + 60_000 };
    try { await env.CARD_ORDER.put('__rev__', rev); return rev; }
    catch (e) { console.warn('rev bump failed', e); return rev; }
}

export function cacheKeyFor(url, rev, scope) {
    const k = new URL(url);
    k.searchParams.set('__v', rev);
    k.searchParams.set('__s', scope);
    return new Request(k.toString(), { method: 'GET' });
}

export function ctxSafePut(key, res) {
    try { caches.default.put(key, res).catch(e => console.warn('cache put failed', e)); }
    catch (e) { console.warn('cache put failed', e); }
}

export async function sendCached(body, request, cacheKey, cacheable, extraHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders,
        'Cache-Control': 'no-store',
        'Vary': 'Accept-Encoding',
    };
    const res = new Response(body, { status: 200, headers });
    if (cacheable) ctxSafePut(cacheKey, res.clone());
    return res;
}

let _htmlMeta = null;
export async function htmlMeta(HTML_CONTENT) {
    if (_htmlMeta) return _htmlMeta;
    const buf = await new Response(HTML_CONTENT).arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const etag = '"' + base64UrlEncodeUint8(new Uint8Array(digest)).slice(0, 32) + '"';
    _htmlMeta = { etag, body: HTML_CONTENT };
    return _htmlMeta;
}

export { CACHE };