# Scheme to URL

将普通网址或 URL Scheme 转换为可分享的 HTTP 跳转链接。

**在线使用：** [https://s2u2.netlify.app/](https://s2u2.netlify.app/)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/weepwood/s2u)

> AI 或自动化参与开发前必须先阅读 [`AGENTS.md`](AGENTS.md)，不得绕过危险协议、Token 存储、历史合并与 Gist 同步边界。

## 功能

- **Scheme 转换** — 支持 `weixin://`、`mailto:`、`tel:` 等自定义 Scheme
- **网页跳转** — 支持完整网址、域名、localhost、IPv4 与 IPv6 地址
- **安全链接编码** — 目标地址整体写入 URL Hash，不发送到静态托管服务器
- **旧链接兼容** — 兼容早期 `#weixin://open` 格式
- **历史记录** — 本地持久化，按最近使用时间排序
- **常用链接** — 内置 Obsidian、VS Code、微信和网易云音乐；支持自定义、编辑、删除、恢复默认及一键复制，图标使用本地静态资源
- **搜索与管理** — 支持搜索、单条删除、清空、导入和导出
- **版本化备份** — 导出文件包含格式版本、更新时间和跨设备删除标记
- **工作区 UI** — 紧凑三页签布局、桌面/移动端统一间距、暗色模式与键盘焦点反馈
- **可发现的命令面板** — 右上角点击「快捷启动」或使用 Ctrl/Cmd+K 搜索收藏及历史
- **示例快速填入** — 一键填入网页、Obsidian、VS Code 和微信链接，不会自动打开应用或保存历史
- **二维码分享** — 浏览器本地绘制二维码并支持 PNG 下载，编码不依赖远端 API
- **收藏分类标签** — 编辑、筛选标签，并在 JSON 导入导出中保留
- **平滑页签切换** — 创建链接、历史记录、常用链接之间滑动选中态及内容过渡，兼容减少动态效果设置
- **深色模式** — 支持浅色和深色界面
- **键盘操作** — `Cmd/Ctrl+Enter` 复制、`Cmd/Ctrl+K` 命令面板、`Esc` 清空、`H` 切换历史，方向键及 Home/End 导航页签
- **GitHub Gist 同步** — 可选跨设备同步，先拉取合并后串行推送

## 安全边界

公开跳转链路允许普通网页协议和自定义应用 Scheme，但不允许以下能够执行脚本或访问本地资源的协议：

- `javascript:`
- `data:`
- `vbscript:`
- `file:`
- `blob:`
- `filesystem:`
- 浏览器内部及扩展协议，如 `about:`、`chrome:`、`edge:`、`view-source:` 和扩展专用协议

GitHub Token 只保存在当前标签页的 `sessionStorage` 中；关闭标签页后需要重新输入。Gist ID 会保存在本地，方便下次继续连接。

Netlify 部署通过 `public/_headers` 设置 CSP、无 Referer、防嵌入和权限限制等响应头。

## 快速开始

```bash
git clone https://github.com/weepwood/s2u.git
cd s2u
npm install
npm run dev
```

## 质量检查

```bash
npm run lint
npm test
npm run build

# 一次执行全部检查
npm run check
```

CI 在所有 Pull Request 执行 ESLint、Node 单元测试、生产构建及 gzip 体积门禁。仅 Markdown 文档变更跳过浏览器；仅共享 CSS/文档变更执行视觉相关冒烟；涉及 Vue、JS、安全、同步、存储、依赖、CI 或未知路径的变更执行完整根路径与子路径回归。master push 和手动触发始终完整回归。首屏 JS/CSS gzip ≤ 80 KiB，总 JS/CSS gzip ≤ 110 KiB（#69 基线 61.06 / 83.85 KiB）。更多视觉与验收要求参见 [`DESIGN.md`](DESIGN.md) 和 [`docs/device-qa.md`](docs/device-qa.md)。

## 使用说明

### 生成链接

1. 输入目标地址：
   - `weixin://open`
   - `example.com`
   - `https://example.com/path?q=1#chapter`
2. 点击“复制链接”或按 `Cmd/Ctrl+Enter`。
3. 分享生成的链接。

新链接格式：

```text
https://s2u2.netlify.app/#target=weixin%3A%2F%2Fopen
```

目标中的 `#`、`%`、查询参数和 Unicode 字符会作为整体编码，避免被浏览器错误截断。

### 常用链接

点击页面顶部“常用链接”页签，可以管理自己的应用 Scheme 或普通网址。点击“打开”会在当前标签页直接导航到所保存的目标（HTTP/HTTPS 网页或应用 Scheme），不会经过 s2u 分享链接；点击“复制分享链接”仍会生成可分享的 Hash URL。默认图标来自项目内静态图片（Obsidian、微信、网易云音乐），VS Code 暂用文本图标。

常用链接与历史记录分别保存在浏览器 `localStorage`，不会因为清空历史记录而丢失，也**不会通过 GitHub Gist 自动同步**。可通过“恢复默认应用”重建内置快捷方式。自定义应用 URI 是否能唤起对应程序，取决于设备和浏览器对该 Scheme 的支持。

### GitHub Gist 同步

1. 打开“历史记录”并展开“云端同步”。
2. [创建最小权限 Fine-grained Token](https://github.com/settings/personal-access-tokens/new?name=S2U%20Gist%20Sync&description=S2U%20workspace%20sync&expires_in=90&gists=write)：选择自己的账号、建议 90 天有效期、Repository access 仅 Public repositories；Account permissions 只设置 Gists → Read and write，不添加其他权限。GitHub 自动附带的只读权限保持默认。若使用 [Classic Token](https://github.com/settings/tokens/new?description=S2U%20Gist%20Sync&scopes=gist)，只勾选 `gist`，不勾选 `repo`、`workflow`、`user` 或组织权限。生成后复制 Token，切勿公开。
3. 输入 Token 并连接。
4. 应用会创建或使用私密 Gist `scheme-history.json`。

同步数据包含：

- 历史记录及每条记录的更新时间
- 删除标记（tombstone），防止其他设备把已删除记录重新带回来
- 数据格式版本

### 导入和导出

- 导出格式为版本化 JSON 对象。
- 仍兼容早期直接导出的数组格式。
- 单个导入文件最大 2 MB。
- 导入前会显示有效与无效记录数量。

## GitHub Pages 自动部署

在仓库 Settings → Pages → Build and deployment 中将 Source 设为 **GitHub Actions**。
合并到 master 后，`.github/workflows/pages.yml` 通过 configure-pages 获取公开 URL，使用既有 Vite 子路径配置构建并发布 dist。
项目站点预期入口为 https://weepwood.github.io/s2u/；Netlify 原入口与 Hash 分享链接继续保留。
旧 `docs/index.html` 是已停用的安全占位页，不再作为部署源，也不会重新启用未经验证的旧跳转脚本。
无需 SPA 服务器重写：分享目标在 Hash 中，直接访问或刷新只需加载站点根页面。

普通网页链接自动导航。已知应用协议自动尝试启动，始终提供手动重试、原始链接复制和返回入口；未知协议需要主动确认，危险协议继续拦截。页面不再强制尝试关闭窗口，也不宣称应用启动成功。
生产 HTML 使用 no-referrer 和 CSP meta 防护；Netlify 继续使用原有完整安全响应头。GitHub Pages 不支持项目自定义响应头，因此 meta 无法等价实现 frame-ancestors、X-Frame-Options、Permissions-Policy、X-Content-Type-Options 等响应头。需要这些完整策略时优先使用 Netlify 或支持自定义响应头的反向代理。
两个域名的本地存储独立，历史可通过已有 Gist 同步机制迁移，常用链接可导出与导入。

## 子路径部署

默认部署在域名根路径，Vite `base` 为 `/`。部署到 `/s2u/` 等子路径时，需要在**构建阶段**设置完整的公开 URL：

```bash
VITE_PUBLIC_BASE_URL=https://example.com/s2u/ npm run build
```

Windows PowerShell 可先运行 `$env:VITE_PUBLIC_BASE_URL="https://example.com/s2u/"`，再执行 `npm run build`。这个变量同时决定 Vite 的静态资源路径、favicon、内置应用图标与生成的分享链接路径。此配置仅支持 HTTP/HTTPS URL，不接受认证信息、查询参数或 Hash。

Netlify 的 `public/_redirects` 提供了 `/s2u/*` → `/:splat` 的路径重写，适用于本仓库当前根目录发布到 Netlify 时额外提供 `/s2u/` 的场景。其它托管平台须自行配置静态文件路径重写、SPA 回退；只调整 Vite `base` 并不足以保证服务器会响应子路径。

CI 分别构建并使用 Chromium 检查根路径与 `/s2u/` 的页面、favicon、图标和分享 Hash。

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Vue 3 Composition API / `<script setup>` |
| 构建 | Vite 8 |
| 持久化 | localStorage + sessionStorage |
| 云同步 | GitHub Gist API |
| 测试 | Node.js Test Runner + Playwright Chromium（每周 Firefox/WebKit 冒烟） |
| 代码检查 | ESLint |
| 部署 | Netlify / GitHub Pages（Actions） |

## 项目结构

```text
src/
├── main.js
├── App.vue
├── components/          # 页面和交互组件（包含常用链接）
├── composables/         # 历史、剪贴板、主题和云同步状态
├── domain/
│   └── linkCodec.js     # 链接规范化、校验和 Hash 编解码
├── styles/              # 页面与动效样式
└── utils/               # 卡片高度与界面动效工具

test/
├── linkCodec.test.js
└── history.test.js

public/
└── _headers             # Netlify 安全响应头
```

## 许可

MIT


### 常用链接的排序与迁移

在常用链接页签中，可以按名称或 URL 搜索，用上移/下移按钮调整卡片顺序，并导出 `s2u-common-links` 版本化 JSON。导入时先检查文件大小（最多 2 MB）、版本、50 条数量上限、危险协议与重复项，再展示预计新增数量供确认。导入采用追加合并，不覆盖现有收藏、历史或 Gist；排序和新收藏仍保存在本机 `localStorage`。自定义图标上传已经实现，并包含在独立 JSON 备份中。

### 直接打开应用与风险提示

常用链接中的“打开”会在点击时直接访问**原始目标**，不会创建 s2u 分享链接。Obsidian、VS Code、微信、网易云音乐等常用协议可直接尝试启动；未列为常用的其它合法应用 Scheme 会先弹出风险确认，避免误唤起陌生程序。不能确定是否启动成功，浏览器可能屏蔽协议或设备没有安装程序。卡片右上角提供“复制原始链接”作为回退；不改变已有 URL Scheme 的兼容与安全拦截规则。


### 自动化浏览器测试

Playwright 1.56.1 作为锁定的 devDependency 与 `package-lock.json` 同步维护，CI 使用 `npm ci` 后直接安装对应浏览器，不再临时修改 node_modules。每次 PR 测试 Chromium（根路径与 `/s2u/`），每周一单独运行 Firefox/WebKit 冒烟测试，不阻塞普通 PR；分支保护（至少必需 `quality` 与 `browser-smoke` 检查、禁止 force push）需由 GitHub 仓库管理员在 Settings 中设置，不能仅靠 CI YAML 实现。


### 依赖清理（#32）

已核查入口 `src/main.js` 和 `src/App.vue` 不注册 Vue Router，仓库没有任何实际页面使用 Vue Router 的导航。Vite 8 采用 Rolldown，`esbuild` 作为 Vite 的可选对等依赖，不需要项目直接安装。移除这两个显式依赖及闲置路由文件，以 npm 重新生成的锁文件为准；不更改页面行为。


### 自定义应用图标

在“常用链接”中点击添加或编辑，可选择本机 PNG、JPEG 或 WebP 图片作为图标。上传原图最多 1 MB，网页在本机 Canvas 缩小到最长 96px，并限制生成后的 data URL 最多 32 KiB。不会向服务器或第三方图标服务上传图片，也不会同步到历史 Gist；图标与收藏一起保存在 localStorage，并包含在常用链接 JSON 导出中。恢复内置/默认图标会移除自定义图片。拒绝 SVG、远程图片 URL、不支持的格式和超长 data URL；旧版没有图标字段的收藏及备份继续兼容。带图标的 JSON 导入文件最大 2 MB。


### 首屏加载性能

首页优先同步加载「创建链接」界面。历史记录/云同步设置与常用链接面板被构建为独立代码块，首次点击对应页签才加载；桌面悬停或键盘聚焦页签时提前预取，后续切换由浏览器模块缓存加速。移除了阻塞首屏渲染的 Google Fonts CSS 请求，改用系统 UI 字体与原有等宽字体回退；CSP 同步收紧以避免无用的第三方字体域名。已连接的 Gist 首次同步延至浏览器空闲时启动，但历史和收藏仍同步读取本地，分享 Scheme 跳转保持优先。

CI 通过 `node scripts/performance-report.mjs` 展示构建后入口 JavaScript/CSS gzip 体积。该指标反映首次需要下载的代码量，不等于真实用户 LCP 或 TTFB；移动端与生产网络的 Web Vitals 仍需独立实测。

### 云同步管理中心

通过顶栏云朵或历史页「云端同步」打开独立弹窗。首次连接须明确选择已有 Gist、手动输入 ID/URL 或创建新文件；不会仅因缺少本地 ID 就自动创建。连接现有文件需要验证当前 GitHub 账号归属、非公开状态及历史格式。Token 仅保存于 sessionStorage，断开时清除 Token，保留最近 Gist ID；不同设备仍使用同一份本地工作区，切换连接前必须确认是否合并上传。不要在共享浏览器使用其他人的工作区。

历史继续使用 scheme-history.json 及原有删除标记格式；收藏（标签、排序）、图标与深浅主题默认不同步，明确开启后使用独立 s2u-common-links.json、s2u-settings.json 文件。收藏及主题采用保守快照三方比较，双端修改或缺少共同基线时暂停并要求用户确认处理方向，而非静默覆盖。图标暂与收藏同文件；关闭图标同步遇到已有远端图标时暂停该同步，避免删除。每文件限制 900 KB，截断或超限停止写入，不自动分片。

连接关闭不删除远端文件；自动同步可暂停，保留待同步标记，网络恢复/焦点返回时检查。无变化不 PATCH，写前备份并检查远端内容，写后重新读取确认。GitHub Gist PATCH 没有原子 CAS，仍可能出现极短并发窗口；Secret Gist 并非真正私密存储，也未提供端到端加密。备份保留最近三份，可导出历史/完整快照，恢复历史先校验和确认后合并至本机；旧删除标记仍有效，不提供强制覆盖恢复。账号切换取消旧请求，浏览器工作区数据不按账号分区。

只读「测试连接」仅验证身份、归属和历史结构，不承诺 Token 有写权限。每次拉取失败会清除已观察远端内容；未成功拉取禁止推送。网络恢复时仅自动重试暂时性网络/5xx 错误，不重试权限与冲突错误。

Token 创建入口使用 GitHub 官方支持的预填参数（`gists=write`），仍由用户确认权限并生成。权限授予的是账户的 Gist，而非单独某个 Gist；不要扩大到仓库或其他账户权限。401/403/404 提供权限或凭据排查提示，读取通过并不证明写入权限。参考：[GitHub Token 官方说明](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) 与 [Gist API](https://docs.github.com/en/rest/gists/gists)。

### Gist 会话安全

新会话将账号和 Gist ID 与当前标签页 Token 绑定；另一标签页切换连接时停止同步并要求重连。老会话首次读取验证实际 GitHub 账号。已绑定本机工作区禁止直接改用另一 GitHub 账号，需先导出数据并使用独立浏览器配置；暂不自动迁移本地历史或收藏到账号分区。同步期间新修改保留待同步标记，断开后仍记录修改；历史备份恢复验证删除标记及当前连接。Gist 原子 CAS 与完整工作区恢复仍未实现。

### 独立账号工作区

连接页提供「切换或新建工作区」，原工作区继续使用旧存储键，新增账号工作区隔离历史、收藏、主题、Gist 配置和恢复快照，按当前标签页选择；切换清除会话 Token 后重新加载。新账号须验证 GitHub 用户名及数字 ID。数据迁移使用完整备份导出/导入并明确确认，不自动迁移或上传。详细限制见 [账号工作区](docs/account-workspaces.md)。这是应用层隔离，不是不同浏览器用户之间的安全边界。

### 收藏管理

桌面端可拖动收藏卡片操作区的手柄调整顺序；搜索或标签筛选时禁用拖拽，原有置顶/上下移按钮继续有效。网格/列表视图为当前面板状态，不改变数据格式。搜索支持空格分隔的多关键词；标签按大小写不敏感归组，管理标签支持确认后重命名或移除该分类（不会删除收藏）。变更通过现有工作区存储入口保存，并遵循可选 Gist 收藏同步及冲突规则。移动端保留按钮排序，不提供触屏拖拽。
