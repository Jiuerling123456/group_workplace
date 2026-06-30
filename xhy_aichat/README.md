# xhy_aichat - Dify AI Chat Bot

基于 Dify Workflow 的 AI 聊天机器人前端，采用纯原生 HTML/CSS/JS 构建，支持本地运行和 Vercel 一键部署。

## 功能特性

- 🚀 **流式 SSE 响应** — 实时显示 AI 回复，支持打字动画效果
- 💬 **多会话管理** — 支持新建、切换、重命名、删除对话
- 🎨 **Markdown 渲染** — 代码高亮、表格、图片等丰富格式支持
- ⏱️ **流超时保护** — 60 秒无响应自动中断，避免卡死
- 🔄 **CORS 代理** — 本地用 Python 代理，线上用 Vercel Serverless 代理
- 📱 **响应式设计** — 适配桌面和移动端

## 项目结构

```
xhy_aichat/
├── index.html         # 前端聊天界面（单文件应用）
├── proxy_server.py    # Python CORS 代理服务器（本地开发用）
├── vercel.json        # Vercel 路由配置
├── api/
│   └── proxy.js       # Vercel Serverless API 代理
├── .env.example       # 环境变量模板
├── .gitignore
└── README.md
```

---

## 方式一：Vercel 部署（推荐）

### 1. 导入项目
在 [Vercel](https://vercel.com) 中 Import Git Repository，选择此仓库。

### 2. 设置根目录
在 Vercel 项目设置中，将 **Root Directory** 设为 `xhy_aichat`。

### 3. 配置环境变量
在 Vercel 项目 **Settings → Environment Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DIFY_API_KEY` | `你的 Dify API Key` | **必需** |
| `DIFY_API_BASE` | `https://api.dify.ai/v1` | 可选，默认云版 |

### 4. 重新部署
保存后触发 Redeploy，部署完成即可访问。

---

## 方式二：本地运行

### 1. 配置环境变量

```bash
# Windows PowerShell:
$env:DIFY_API_KEY="your-dify-api-key"

# macOS / Linux:
export DIFY_API_KEY="your-dify-api-key"
```

### 2. 安装依赖

```bash
pip install requests
```

### 3. 启动服务

```bash
python proxy_server.py
```

### 4. 打开页面

浏览器访问：`http://localhost:8088/index.html`

---

## 使用说明

1. 在输入框中输入消息，按 Enter 或点击发送按钮
2. 左侧边栏管理对话历史
3. 支持对 AI 回复进行点赞/踩反馈
4. 生成中可点击停止按钮中断

## 技术栈

- **前端**：原生 HTML + CSS + JavaScript（零依赖）
- **本地代理**：Python `http.server` + `requests` 库
- **线上代理**：Vercel Serverless Functions (Node.js)
- **AI 平台**：[Dify](https://dify.ai) Workflow API

## 许可证

MIT
