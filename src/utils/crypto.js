let _tseKey = null;

export async function timingSafeStringEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (!_tseKey) {
        _tseKey = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode('cfile-tse-fixed-key-v1'),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
    }
    const [ha, hb] = await Promise.all([
        crypto.subtle.sign('HMAC', _tseKey, new TextEncoder().encode(a)),
        crypto.subtle.sign('HMAC', _tseKey, new TextEncoder().encode(b)),
    ]);
    const ua = new Uint8Array(ha);
    const ub = new Uint8Array(hb);
    if (ua.length !== ub.length) return false;
    let diff = 0;
    for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
    return diff === 0;
}
