# 📚 Keyword AI Bot - 学术关键词研究助手

基于 [Dify AI](https://dify.ai) Workflow API 构建的学术关键词研究助手前端页面。输入学术研究关键词，自动检索 arXiv 论文数据库并生成专业的文献分析报告。

## ✨ 功能特性

- **学术论文检索**：输入关键词，自动搜索 arXiv 上的相关论文
- **流式响应**：支持 SSE (Server-Sent Events) 流式输出，打字机效果实时展示
- **论文信息格式化**：自动解析并美化展示论文标题、作者、发表日期和摘要
- **工作流进度可视化**：实时显示 Dify Workflow 各节点执行状态
- **消息操作**：支持点赞/点踩反馈、一键复制回复内容
- **响应式设计**：适配桌面和移动端，现代简洁的 UI 界面

## 🚀 快速开始

### 方式一：直接打开

1. 克隆仓库到本地
2. 用浏览器直接打开 `keyword_aibot/index.html` 即可使用

### 方式二：本地服务器

```bash
cd keyword_aibot
# Python 3
python -m http.server 8080
# 或使用 Node.js
npx serve .
```

然后访问 `http://localhost:8080`

## 🛠️ 技术架构

```
┌─────────────────┐     SSE Streaming      ┌──────────────────┐
│   index.html    │ ◄────────────────────── │  Dify Workflow   │
│  (前端单页面)    │     POST /v1/workflows/run  │  (Arxiv 检索+LLM) │
└─────────────────┘                         └──────────────────┘
```

- **前端**：纯原生 HTML + CSS + JavaScript，零依赖
- **API**：Dify AI Workflow API (`/v1/workflows/run`)
- **响应模式**：Streaming (SSE)
- **后端工作流**：Dify 工作流引擎（LLM + 代码执行 + Arxiv 检索）

## 📖 使用方法

1. 在输入框中输入学术关键词（如 `machine learning`、`NLP`、`computer vision`）
2. 按 Enter 或点击发送按钮
3. 等待工作流执行，实时查看检索和分析结果
4. 可对结果进行点赞/点踩或复制
5. 点击"+ 新对话"可以清除当前对话

## 📁 项目结构

```
keyword_aibot/
├── index.html      # 主页面（包含全部 HTML/CSS/JS）
└── README.md       # 项目文档
```

## 🔧 配置说明

API 配置位于 `index.html` 中的 JavaScript 部分：

```javascript
const API_BASE_URL = 'https://api.dify.ai/v1';
const API_KEY = 'your-api-key-here';
```

如需更换为自己的 Dify 应用：
1. 在 [Dify Cloud](https://cloud.dify.ai) 创建 Workflow 类型应用
2. 确保 Workflow 接收 `keyword` 作为输入变量
3. 在应用 API 设置中获取 API Key
4. 替换 `index.html` 中的 `API_KEY` 和 `API_BASE_URL`

## 📄 License

MIT License
