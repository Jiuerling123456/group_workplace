# xhy_aichat - Dify AI Chat Bot

基于 Dify Workflow 的 AI 聊天机器人前端，采用纯原生 HTML/CSS/JS 构建，通过 Python 代理服务器解决浏览器跨域问题。

## 功能特性

- 🚀 **流式 SSE 响应** — 实时显示 AI 回复，支持打字动画效果
- 💬 **多会话管理** — 支持新建、切换、重命名、删除对话
- 🎨 **Markdown 渲染** — 代码高亮、表格、图片等丰富格式支持
- ⏱️ **流超时保护** — 60 秒无响应自动中断，避免卡死
- 🔄 **CORS 代理** — 内置 Python 代理服务器，无需后端改造
- 📱 **响应式设计** — 适配桌面和移动端

## 项目结构

```
xhy_aichat/
├── index.html         # 前端聊天界面（单文件应用）
├── proxy_server.py    # Python CORS 代理服务器
├── .env.example       # 环境变量模板
├── .gitignore
└── README.md
```

## 快速开始

### 1. 配置环境变量

```bash
# 设置 Dify API Key（必需）
# Windows PowerShell:
$env:DIFY_API_KEY="your-dify-api-key"

# macOS / Linux:
export DIFY_API_KEY="your-dify-api-key"

# 可选：自定义 Dify API 地址（默认为 Dify Cloud）
export DIFY_API_BASE="https://api.dify.ai/v1"
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

## 使用说明

1. 在输入框中输入消息，按 Enter 或点击发送按钮
2. 左侧边栏管理对话历史
3. 支持对 AI 回复进行点赞/踩反馈
4. 生成中可点击停止按钮中断

## 技术栈

- **前端**：原生 HTML + CSS + JavaScript（零依赖）
- **后端代理**：Python `http.server` + `requests` 库
- **AI 平台**：[Dify](https://dify.ai) Workflow API

## 许可证

MIT
