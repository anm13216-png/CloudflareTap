const MAX_CATEGORIES = 100;
const MAX_LINKS_TOTAL = 3000;
const MAX_NAME = 120, MAX_TIPS = 500, MAX_URL = 2048;
const URL_SCHEME_OK = new Set(['http:', 'https:']);

export function validateCategories(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'CATEGORIES_TYPE' };
    const keys = Object.keys(raw);
    if (keys.length > MAX_CATEGORIES) return { ok: false, reason: 'TOO_MANY_CATEGORIES' };

    let total = 0;
    for (const name of keys) {
        if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME) {
            return { ok: false, reason: 'BAD_CATEGORY_NAME' };
        }
        const cat = raw[name];
        const links = Array.isArray(cat) ? cat : (cat && Array.isArray(cat.links) ? cat.links : null);
        if (!links) return { ok: false, reason: 'BAD_CATEGORY_SHAPE' };

        total += links.length;
        for (const l of links) {
            if (!l || typeof l !== 'object') return { ok: false, reason: 'BAD_LINK' };
            if (typeof l.name !== 'string' || l.name.length === 0 || l.name.length > MAX_NAME) return { ok: false, reason: 'BAD_NAME' };
            if (typeof l.url !== 'string' || l.url.length === 0 || l.url.length > MAX_URL) return { ok: false, reason: 'BAD_URL' };

            let u;
            try { u = new URL(l.url); } catch { return { ok: false, reason: 'BAD_URL_FORMAT' }; }
            if (!URL_SCHEME_OK.has(u.protocol)) return { ok: false, reason: 'URL_SCHEME' };

            if (l.tips != null && typeof l.tips !== 'string') return { ok: false, reason: 'BAD_TIPS' };
            if (l.icon != null && typeof l.icon !== 'string') return { ok: false, reason: 'BAD_ICON' };
            if (l.lanUrl != null && typeof l.lanUrl !== 'string') return { ok: false, reason: 'BAD_LANURL' };
            for (const flag of ['isPrivate', 'isDirect']) {
                if (l[flag] != null && typeof l[flag] !== 'boolean') return { ok: false, reason: 'BAD_FLAG' };
            }
        }
    }
    if (total > MAX_LINKS_TOTAL) return { ok: false, reason: 'TOO_MANY_LINKS' };
    return { ok: true };
}

export function sanitizeCategories(raw) {
    const out = {};
    for (const name of Object.keys(raw)) {
        const cat = Array.isArray(raw[name]) ? { isHidden: false, links: raw[name] } : raw[name];
        out[name] = {
            isHidden: !!cat.isHidden,
            links: (cat.links || []).map(l => ({
                name: String(l.name).slice(0, MAX_NAME),
                url: String(l.url).slice(0, MAX_URL),
                tips: l.tips ? String(l.tips).slice(0, MAX_TIPS) : '',
                icon: l.icon ? String(l.icon).slice(0, MAX_URL) : '',
                isPrivate: !!l.isPrivate,
                isDirect: !!l.isDirect,
                lanUrl: l.lanUrl ? String(l.lanUrl).slice(0, MAX_URL) : '',
                category: l.category ? String(l.category).slice(0, MAX_NAME) : name,
            })),
        };
    }
    return out;
}