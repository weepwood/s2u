# Scheme to URL

将普通网址或 URL Scheme 转换为可分享的 HTTP 跳转链接。

**在线使用：** [https://s2u2.netlify.app/](https://s2u2.netlify.app/)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/weepwood/s2u)

## 功能

- **Scheme 转换** — 支持 `weixin://`、`mailto:`、`tel:` 等自定义 Scheme
- **网页跳转** — 支持完整网址、域名、localhost、IPv4 与 IPv6 地址
- **安全链接编码** — 目标地址整体写入 URL Hash，不发送到静态托管服务器
- **旧链接兼容** — 兼容早期 `#weixin://open` 格式
- **历史记录** — 本地持久化，按最近使用时间排序
- **搜索与管理** — 支持搜索、单条删除、清空、导入和导出
- **版本化备份** — 导出文件包含格式版本、更新时间和跨设备删除标记
- **深色模式** — 支持浅色和深色界面
- **快捷键** — `Cmd/Ctrl+Enter` 复制、`Esc` 清空、`H` 切换历史
- **GitHub Gist 同步** — 可选跨设备同步，先拉取合并后串行推送

## 安全边界

公开跳转链路允许普通网页协议和自定义应用 Scheme，但不允许以下能够执行脚本或访问本地资源的协议：

- `javascript:`
- `data:`
- `vbscript:`
- `file:`
- `blob:`

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

CI 会在提交到 `master` 或创建 Pull Request 时执行 ESLint、Node 单元测试和生产构建。

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

### GitHub Gist 同步

1. 打开“历史记录”并展开“云端同步”。
2. 创建具备 Gist 读写权限的 GitHub Token。
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

## 子路径部署

默认部署在域名根路径。部署到 `/s2u/` 等子路径时，可通过 Vite `base` 配置或设置完整公开地址：

```env
VITE_PUBLIC_BASE_URL=https://example.com/s2u/
```

生成链接时会使用该地址，而不是固定拼接 `window.location.origin`。

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Vue 3 Composition API / `<script setup>` |
| 构建 | Vite 6 |
| 持久化 | localStorage + sessionStorage |
| 云同步 | GitHub Gist API |
| 测试 | Node.js Test Runner |
| 代码检查 | ESLint |
| 部署 | Netlify |

## 项目结构

```text
src/
├── main.js
├── App.vue
├── components/          # 页面和交互组件
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
