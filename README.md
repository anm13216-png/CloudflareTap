# CloudflareTap - 个人导航书签页
[MIT](LICENSE)

[MIT](LICENSE)
# CloudflareTap - 个人导航书签页

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/UI-Tailwind%20CSS-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white" alt="JWT">
  <img src="https://img.shields.io/badge/Storage-KV-F38020?logo=cloudflare&logoColor=white" alt="KV">
  <img src="https://img.shields.io/badge/Build-esbuild-FFCF00?logo=esbuild&logoColor=black" alt="esbuild">
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

一个部署在 **Cloudflare Workers** 上的全栈导航书签页。使用 esbuild 模块化构建，GitHub Actions **全自动部署**，数据存储在 Cloudflare KV 中。

## ✨ 功能特性

### 📌 导航管理
- 🗂️ **分类管理** — 支持创建、编辑、删除、隐藏书签分类
- 🔖 **书签卡片** — 以卡片形式展示网站书签，自动获取网站图标
- 🔀 **拖拽排序** — 支持 PC 和移动端触摸拖拽，自由排列卡片顺序
- 🔍 **全局搜索** — 快速搜索书签名称和链接
- 🌐 **网站状态** — 实时检测书签网站在线/离线/慢速状态
- 🖱️ **自定义右键菜单** — 右键卡片弹出操作菜单：
  - 打开链接（新标签页）
  - 复制链接
  - 打开内网链接 / 复制内网链接
  - 快速编辑
  - 删除

### ✏️ 高级编辑弹窗
- 🔗 **地址** — URL 输入 + ⚡ 一键获取网站图标
- 📝 **标题** — 名称输入 + 🔍 一键获取标题 + 实时字数统计
- 🎨 **图标** — 三种模式自由切换：
  - **在线 / Iconify** — 输入 Iconify 图标标识符（如 `devicon:google`）或图片 URL，支持 [Iconify 图标库](https://icon-sets.iconify.design/) 在线浏览
  - **纯文字** — 输入 1-6 位文字或 Emoji 作为图标
  - **上传图片** — 本地图片上传，自动转为 Base64 存储
- 👁️ **图标实时预览** — 编辑时即时预览图标效果
- 🌐 **内网地址** — 可选的内网 IP / 地址字段
- 📄 **描述信息** — 简短描述 + 实时字数统计
- 🗂️ **分类选择** — 下拉选择目标分类
- 🔒 **私密链接** — 设为仅登录可见

### 🎨 界面体验
- 🌓 **暗色模式** — 支持亮色/暗色主题自由切换
- 💎 **毛玻璃效果** — 现代化的玻璃态 UI 设计
- 📱 **响应式布局** — 完美适配桌面端和移动端
- ✨ **流畅动画** — 弹窗、下拉菜单等交互动画

### 🔐 安全特性
- 👤 **用户名 + 密码登录** — 管理员用户名密码双重认证
- 🎫 **JWT 双令牌** — Access Token（2h）+ Refresh Token（30天，HttpOnly Cookie）
- 🛡️ **登录限速** — 基于 IP 的速率限制，5 次失败锁定 15 分钟
- ⏱️ **时序安全** — 用户名与密码比较均使用恒定时间算法，防止计时攻击
- 🚪 **一键登出** — 递增 Key Generation 吊销所有已发 Token

### 📦 数据管理
- 💾 **智能备份** — 数据变更时自动备份，10 分钟内不重复备份，自动保留最近 10 份
- 📤 **数据导出** — 一键导出完整 JSON 数据
- 📥 **多格式导入** — 支持以下格式：
  - ✅ CloudflareTap 原生 JSON
  - ✅ **Sun-Panel 导出 JSON**（自动检测转换）
  - ✅ Chrome / Edge 浏览器书签 HTML
- ⚡ **边缘缓存** — HTML 响应支持 ETag + Cloudflare 边缘缓存

---

## 🚀 部署指南

### GitHub Actions 全自动部署（推荐）

**一次配置，全自动完成**：KV 数据库创建、JWT 密钥生成、管理员账号设置、Worker 部署，全部由 CI 流水线自动处理，无需在 Cloudflare 控制台做任何额外配置。

#### 第一步：Fork 仓库

点击页面右上角 **Fork** 按钮，将本仓库 Fork 到你的 GitHub 账号下。

#### 第二步：获取 Cloudflare 密钥

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. **Account ID**：在控制台主页右侧边栏找到并复制
3. **API Token**：
   - 点击右上角头像 → **My Profile** → **API Tokens** → **Create Token**
   - 选择 **创建自定义令牌**（Create Custom Token），添加 **两条** 权限：

     | 资源类型 | 权限名称 | 操作 |
     |---------|---------|------|
     | 帐户 | **Workers KV 存储** | 编辑 |
     | 帐户 | **Worker 脚本** | 编辑 |

     > ⚠️ 注意：「Workers KV 存储」和「Worker 脚本」是 **两个不同的权限类别**，需要分别添加两行。搜索时输入「Workers KV」找到存储权限，输入「Worker 脚本」找到脚本权限。

   - 帐户资源选择「包括 - 所有帐户」
   - 点击 **继续以显示摘要** → **创建令牌**，复制生成的 Token

#### 第三步：在 GitHub 仓库添加 Secrets

进入你 Fork 的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret 名称 | 必填 | 说明 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | 上一步创建的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare Account ID |
| `ADMIN_USERNAME` | ❌ | 管理员用户名，不设则默认 `admin` |
| `ADMIN_PASSWORD` | ❌ | 管理员密码，不设则自动生成 8 位随机密码 |
| `JWT_SECRET` | ❌ | JWT 签名密钥，不设则自动生成 64 位随机串 |

> 只需设置前两项即可完成部署，其余均自动处理。

#### 第四步：触发部署

- **方式一**：推送代码到 `master` 分支，自动触发部署
- **方式二**：进入 **Actions** → **Deploy to Cloudflare Workers** → **Run workflow** 手动触发

#### 部署流水线自动完成以下工作：

```
📦 构建打包 (esbuild)
    ↓
🗄️ 创建 KV 命名空间（已有则自动复用）
    ↓
📝 动态配置 wrangler.toml
    ↓
🚀 部署 Worker 到 Cloudflare
    ↓
🔑 写入 JWT_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD
    ↓
📋 输出部署摘要
```

#### 第五步：查看自动生成的凭据

首次部署后，如果你没有手动设置密码等参数，系统会自动生成。

前往 **Cloudflare Dashboard** → **Workers & Pages** → **cloudflare-tap** → **Settings** → **Variables and Secrets**，即可查看自动生成的管理员用户名、密码和 JWT 密钥。

> ⚠️ **重要提示**：后续重新部署 **不会覆盖** 已有的密钥和密码，你的数据和凭据始终安全。


### ❗ 常见部署问题

#### 错误：`You need to register a workers.dev subdomain`

如果部署时 GitHub Actions 日志出现以下错误：

```
⚠ You need to register a workers.dev subdomain before publishing to workers.dev
✘ You can either deploy your worker to one or more routes by specifying them in wrangler.toml,
  or register a workers.dev subdomain here:
  https://dash.cloudflare.com/***/workers/onboarding
```

这是因为你的 Cloudflare 账号 **尚未开通 workers.dev 子域名**。有两种解决方法：

**方法一：注册 workers.dev 子域名（推荐，30 秒搞定）**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击页面上方的 **设置子域名** 提示（或在概览页右侧找到 `workers.dev` 子域名设置）
4. 选择一个你喜欢的子域名（如 `myname`），确认注册
5. 回到 GitHub Actions，点击 **Re-run all jobs** 重新运行

注册完成后，你的网站地址将是：`https://cloudflare-tap.你的子域名.workers.dev`

**方法二：绑定自定义域名**

如果你有自己的域名（已添加到 Cloudflare），可以跳过 workers.dev，直接绑定自定义域名：

1. 确保你的域名已添加到 Cloudflare 并完成 DNS 托管
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
3. 找到 `cloudflare-tap` Worker（如果是首次部署失败，需要先用方法一完成一次部署，或在本地用 `npx wrangler deploy` 部署一次）
4. 点击 **cloudflare-tap** → **Settings** → **Domains & Routes**
5. 点击 **Add** → **Custom domain**
6. 输入你想绑定的域名（如 `nav.example.com`）
7. Cloudflare 会自动添加 DNS 记录，点击确认即可

或者，你也可以直接在 `wrangler.toml` 中配置路由（需要取消注释并修改）：

```toml
# 在 wrangler.toml 末尾添加自定义域名路由（可选）
# routes = [
#   { pattern = "nav.example.com", custom_domain = true }
# ]
```

> 💡 **提示**：绑定自定义域名后，即使没有注册 workers.dev 子域名也可以正常使用。

---

### 本地开发

```bash
# 克隆项目
git clone https://github.com/axzcnzxis/CloudflareTap.git
cd CloudflareTap

# 安装依赖
npm install

# 构建
npm run build

# 本地开发（需先在 wrangler.toml 中填入你的 KV namespace ID）
npm run dev
```

---

## ⚙️ 环境变量说明

| 变量名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `JWT_SECRET` | Secret | ✅ | JWT 签名密钥，≥ 32 字符 | CI 自动生成 64 位随机串 |
| `ADMIN_USERNAME` | Secret | ✅ | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | Secret | ✅ | 管理员登录密码，≥ 8 字符 | CI 自动生成 8 位随机密码 |
| `CARD_ORDER` | KV Binding | ✅ | KV 命名空间绑定 | CI 自动创建 |
| `DEFAULT_USER` | Variable | ❌ | 默认用户标识 | `admin` |
| `ICON_API` | Variable | ❌ | 网站图标 API 地址 | `https://api.xinac.net/icon/?url=` |
| `PREFER_ICON_API` | Variable | ❌ | 是否优先使用图标 API | `true` |
| `ALLOWED_ORIGINS` | Variable | ❌ | CORS 允许的来源域名（逗号分隔） | 空（不启用 CORS） |

---

## 🎨 图标使用指南

CloudflareTap 支持多种图标设置方式：

### 在线 / Iconify 图标
输入 Iconify 图标标识符，格式为 `前缀:图标名`：
- `devicon:google` — Google 图标
- `logos:chrome` — Chrome Logo
- `mdi:home` — Material Design 主页图标
- `simple-icons:github` — GitHub 图标

👉 浏览完整图标库：[icon-sets.iconify.design](https://icon-sets.iconify.design/)

也可以直接输入图片 URL（如 `https://example.com/icon.png`），或留空由系统自动获取网站 favicon。

### 纯文字图标
输入 1-6 位文字或 Emoji，例如：
- 📺 — Emoji 图标
- 博客 — 中文文字图标
- AI — 字母图标

### 上传图片
点击「选择本地图片」上传 PNG/JPG/SVG 等格式图片（≤ 512KB），自动转为 Base64 存储。

---

## 📥 从 Sun-Panel 迁移

如果你之前使用的是 [Sun-Panel](https://github.com/hslr-s/sun-panel)，可以直接导入：

1. 在 Sun-Panel 中导出数据（JSON 格式）
2. 登录 CloudflareTap → 设置 → 导入数据
3. 选择 Sun-Panel 导出的 `.json` 文件
4. 系统自动检测格式并转换，无需手动处理

**支持转换的内容：**
- ✅ 所有分组和书签
- ✅ 分组排序
- ✅ 书签名称、URL、描述
- ✅ 完整 URL 格式的图标
- ⚠️ Sun-Panel 内部上传的图标（`/uploads/...` 路径）无法迁移，CloudflareTap 会自动获取网站 favicon 替代

---

## 📁 项目结构

```
CloudflareTap/
├── package.json              # 项目配置 + npm 脚本
├── build.js                  # esbuild 构建脚本
├── wrangler.toml             # Cloudflare Workers 部署配置
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions 全自动部署流水线
├── src/
│   ├── worker.js             # Worker 入口：路由分发
│   ├── api/
│   │   ├── auth.js           # 登录/登出/Token 刷新与验证
│   │   ├── links.js          # 书签 CRUD（getLinks / saveData）
│   │   ├── backup.js         # 备份/导出/导入（含 Sun-Panel 转换）
│   │   └── icon.js           # 图标代理（handleIconProxy）
│   ├── utils/
│   │   ├── jwt.js            # JWT 创建/验证/base64url 编解码
│   │   ├── crypto.js         # 恒定时间字符串比较
│   │   ├── kv.js             # KV 读写封装
│   │   ├── cache.js          # 边缘缓存操作
│   │   ├── response.js       # CORS / assertEnv / JSON 响应工具
│   │   ├── validate.js       # 数据校验与清理
│   │   └── config.js         # 运行时配置管理
│   └── frontend/
│       └── index.html        # 完整前端 HTML 模板（含内联 JS / CSS）
└── dist/
    └── worker.js             # 构建产物（CI 自动生成，不提交 Git）
```

---

## 🛠️ 技术栈

| 领域 | 技术 |
|------|------|
| **运行时** | Cloudflare Workers（V8 Isolates） |
| **构建工具** | esbuild — 模块化开发，单文件打包 |
| **前端框架** | Tailwind CSS（CDN） |
| **认证方案** | JWT（HMAC-SHA256）— 用户名 + 密码 |
| **数据存储** | Cloudflare KV |
| **缓存策略** | ETag + Cloudflare Cache API |
| **图标服务** | [Iconify API](https://api.iconify.design/) + 自定义 Favicon API |
| **CI/CD** | GitHub Actions — 全自动部署 |

---

## 📄 License

[MIT](LICENSE)
