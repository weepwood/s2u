# Scheme to URL

将 URL Scheme（如 `weixin://`）或任意网址转换为可分享的 HTTP 跳转链接。

适用于微信内置浏览器、邮件客户端等不支持原生 Scheme 跳转的场景。

**在线使用：** [https://weepwood.github.io/s2u/](https://weepwood.github.io/s2u/)

---

## 功能

- **Scheme 转换** — 输入 `weixin://open`，生成 `https://s2u/#weixin://open` 链接
- **网页跳转** — 也支持普通网址，如 `baidu.com`、`https://example.com`
- **自动跳转** — 访问生成的链接时，页面自动读取 hash 并跳转到目标
- **历史记录** — 本地持久化，按使用次数和时间排序
- **搜索过滤** — 历史列表支持实时搜索
- **单条删除** — 可删除单条历史记录
- **导出/导入** — JSON 格式导出导入，方便迁移
- **深色模式** — 点击右上角 ☾/☀ 切换
- **快捷键** — `Cmd/Ctrl+Enter` 复制 / `Esc` 清空 / `H` 切换历史
- **GitHub Gist 同步** — 可选云端备份，跨设备同步

## 快速开始

### 本地开发

```bash
git clone https://github.com/weepwood/weepwood-scheme-to-url.git
cd weepwood-scheme-to-url
pnpm install
pnpm dev
```

### 构建

```bash
pnpm build
```

构建产物输出到 `dist/`，可直接部署到 GitHub Pages 或任意静态托管服务。

## 使用说明

### 生成链接

1. 在输入框中输入 URL Scheme 或网址
   - `weixin://open` → 生成微信跳转链接
   - `baidu.com` → 生成百度跳转链接（自动补 `https://`）
   - `https://example.com/path` → 原样跳转
2. 点击 **Copy** 或按 `Enter` 复制生成的链接
3. 分享给他人即可

### 跳转原理

访问 `https://s2u/#目标地址` 时，页面从 hash 中提取目标地址并执行 `window.location.replace()`，实现自动跳转。

### GitHub Gist 同步

1. 打开历史页面 → 点击 **⚙** 按钮
2. 创建 GitHub [Personal Access Token](https://github.com/settings/tokens)（勾选 `gist` scope）
3. 粘贴 Token → 点击 **连接**
4. 之后每次增删历史记录，自动同步到私密 Gist

### 快捷键

| 快捷键 | 作用 |
|---|---|
| `Enter` | 复制链接 |
| `Cmd/Ctrl + Enter` | 复制链接 |
| `Esc` | 清空输入框 |
| `H`（非输入状态） | 切换历史/创建模式 |

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Vue 3 (Options API) |
| 构建 | Vite 4 |
| 路由 | vue-router 4 |
| 字体 | Cormorant Garamond / Inter / JetBrains Mono |
| 持久化 | localStorage + GitHub Gist API |
| 部署 | GitHub Pages |

## 设计系统

项目参考 [Anthropic Claude](https://claude.ai) 设计语言，详见 [DESIGN.md](./DESIGN.md)。

- 暖调奶油画布 `#faf9f5`
- 灰蓝主色 `#5b7fab`
- 卡片色 `#efe9de`
- 衬线标题 + 无衬线正文 + 等宽代码字体

## 项目结构

```
src/
├── main.js               # 入口
├── App.vue               # 根组件
├── router/index.js       # 路由配置
└── components/
    └── Change.vue        # 主页面（全部功能）
docs/
└── index.html            # 旧版纯 HTML 实现（归档）
```

## 许可

MIT
