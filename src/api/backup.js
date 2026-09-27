import { validateServerToken } from './auth.js';
import { jsonResponse } from '../utils/response.js';
import { readJsonBody } from '../utils/kv.js';
import { getDefaultUser } from '../utils/config.js';
import { bumpRev } from '../utils/cache.js';
import { validateCategories, sanitizeCategories } from '../utils/validate.js';

// ---------- Sun-Panel 后端兼容转换 ----------
function convertSunPanelToCloudflareTap(data) {
    if (!data || data.appName !== 'Sun-Panel-Config' || !Array.isArray(data.icons)) return null;
    const categories = {};
    for (const group of data.icons) {
        const catName = (group.title || '').trim() || '未分类';
        if (!Array.isArray(group.children) || group.children.length === 0) continue;
        const sorted = [...group.children].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        const links = [];
        for (const child of sorted) {
            const url = (child.url || '').trim();
            if (!url) continue;
            try { const u = new URL(url); if (u.protocol !== 'http:' && u.protocol !== 'https:') continue; } catch { continue; }
            const name = (child.title || '').trim() || url;
            const tips = (child.description || '').trim();
            let icon = '';
            if (child.icon && child.icon.itemType === 2 && child.icon.src) {
                const src = child.icon.src.trim();
                if (/^https?:\/\//i.test(src)) icon = src;
            }
            links.push({ name, url, tips, icon, isPrivate: false, isDirect: false, lanUrl: '' });
        }
        if (links.length > 0) categories[catName] = { isHidden: false, links };
    }
    return Object.keys(categories).length > 0 ? { categories } : null;
}

// ---------- 手动备份 ----------
export async function handleBackupData(request, env) {
    const validation = await validateServerToken(request.headers.get('Authorization'), env);
    if (!validation.isValid) return jsonResponse(validation.response, validation.status, request, env);

    const DEFAULT_USER = getDefaultUser();
    const sourceData = await env.CARD_ORDER.get(DEFAULT_USER);

    if (sourceData) {
        const now = Date.now();
        const date = new Date(now + 8 * 3600 * 1000);
        const dateStr = date.toISOString().replace(/[:.]/g, '-');
        await env.CARD_ORDER.put(`backup_${DEFAULT_USER}_${dateStr}`, sourceData, {
            metadata: { timestamp: now }
        });

        return jsonResponse({ success: true }, 200, request, env);
    }
    return jsonResponse({ success: false, error: 'User data not found' }, 404, request, env);
}

// ---------- 导出数据 ----------
export async function handleExportData(request, env) {
    const validation = await validateServerToken(request.headers.get('Authorization'), env);
    if (!validation.isValid) return jsonResponse(validation.response, validation.status, request, env);

    const DEFAULT_USER = getDefaultUser();
    const data = await env.CARD_ORDER.get(DEFAULT_USER);
    return new Response(data || '{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

// ---------- 导入数据 ----------
export async function handleImportData(request, env) {
    const validation = await validateServerToken(request.headers.get('Authorization'), env);
    if (!validation.isValid) return jsonResponse(validation.response, validation.status, request, env);

    const bodyObj = await readJsonBody(request);
    if (!bodyObj.ok) return jsonResponse({ error: bodyObj.reason }, bodyObj.reason === 'TOO_LARGE' ? 413 : 400, request, env);

    // 兼容 Sun-Panel 格式：自动检测并转换
    let importPayload = bodyObj.data;
    const sunPanelConverted = convertSunPanelToCloudflareTap(importPayload);
    if (sunPanelConverted) importPayload = sunPanelConverted;
    const categories = (importPayload.categories) || {};

    const check = validateCategories(categories);
    if (!check.ok) return jsonResponse({ error: 'INVALID_DATA', detail: check.reason }, 422, request, env);

    const cleanData = {
        categories: sanitizeCategories(categories)
    };

    const DEFAULT_USER = getDefaultUser();
    await env.CARD_ORDER.put(DEFAULT_USER, JSON.stringify(cleanData));

    const rev = await bumpRev(env);
    return jsonResponse({ success: true, rev }, 200, request, env);
}
// ---------- 智能备份（限流 + 自动清理旧备份） ----------
const MIN_BACKUP_INTERVAL_MS = 10 * 60 * 1000;

export async function handleSmartBackup(env, currentData) {
    try {
        const DEFAULT_USER = getDefaultUser();
        const list = await env.CARD_ORDER.list({ prefix: `backup_${DEFAULT_USER}_` });
        let keys = list.keys;

        keys.sort((a, b) => a.name.localeCompare(b.name));

        let shouldBackup = true;

        if (keys.length > 0) {
            const lastBackupMeta = keys[keys.length - 1].metadata;
            if (lastBackupMeta && lastBackupMeta.timestamp) {
                 const timeDiff = Date.now() - lastBackupMeta.timestamp;
                 if (timeDiff < MIN_BACKUP_INTERVAL_MS) {
                     shouldBackup = false;
                 }
            }
        }

        if (shouldBackup) {
            const now = Date.now();
            const date = new Date(now + 8 * 3600 * 1000);
            const dateStr = date.toISOString().replace(/[:.]/g, '-');
            const backupKey = `backup_${DEFAULT_USER}_${dateStr}`;

            await env.CARD_ORDER.put(backupKey, currentData, {
                metadata: { timestamp: now }
            });

            if (keys.length >= 10) {
                const deleteCount = keys.length + 1 - 10;
                if (deleteCount > 0) {
                    const toDelete = keys.slice(0, deleteCount);
                    for (const key of toDelete) {
                        await env.CARD_ORDER.delete(key.name);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Smart backup failed:", e);
    }
}