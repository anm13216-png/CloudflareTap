// 配置默认值（模块内可变状态）
let DEFAULT_USER = 'testUser';
let ICON_API = 'https://api.xinac.net/icon/?url=';
let PREFER_ICON_API = true;

export function resolveConfig(env) {
    if (env.DEFAULT_USER) DEFAULT_USER = env.DEFAULT_USER;
    if (env.ICON_API) ICON_API = env.ICON_API;
    if (env.PREFER_ICON_API !== undefined) PREFER_ICON_API = env.PREFER_ICON_API === 'true';
}

export function getDefaultUser() { return DEFAULT_USER; }
export function getIconApi() { return ICON_API; }
export function isPreferIconApi() { return PREFER_ICON_API; }
