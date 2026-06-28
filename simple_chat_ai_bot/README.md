# Simple Chat AI Bot

基于 [Dify](https://dify.ai) API 的简洁 AI 聊天机器人前端应用。

纯原生 HTML / CSS / JavaScript 实现，无框架依赖，开箱即用。

## 功能一览

| 功能 | 说明 |
|------|------|
| 流式对话 | SSE 流式响应，实时逐字显示 AI 回复 |
| 会话管理 | 新建 / 切换 / 删除会话，自动加载历史记录 |
| 消息历史 | 加载并渲染历史对话 |
| 消息反馈 | 对 AI 回复点赞 / 点踩 |
| 文件上传 | 支持图片和文档上传，附带预览 |
| 停止生成 | 随时中断正在生成的回复 |
| 应用参数 | 自动加载开场白、输入变量、建议问题 |
| 应用信息 | 查看应用工具图标等元信息 |
| 文字转语音 | 朗读 AI 回复 |
| 语音输入 | 麦克风录音转文字发送 |

## 项目结构

```
simple_chat_ai_bot/
├── index.html      # 主页面
├── style.css       # 样式（深色主题）
├── dify-api.js     # Dify API 封装
└── app.js          # 主逻辑
```

## 快速开始

### 1. 配置

打开 `app.js`，修改顶部配置：

```javascript
const config = {
  baseUrl: 'https://api.dify.ai/v1',   // Dify API 地址
  apiKey: 'app-xxxxxxxxxxxxxxxx',       // 你的 API Key
  user: 'user-123',                     // 用户标识
};
```

也可在页面「设置」弹窗中实时修改。

### 2. 运行

```bash
# Python
python -m http.server 8080

# 或 Node.js
npx http-server -p 8080
```

浏览器访问 http://localhost:8080

## API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/chat-messages` | POST | 发送对话消息 |
| `/chat-messages/{task_id}/stop` | POST | 停止生成 |
| `/conversations` | GET | 获取会话列表 |
| `/conversations/{id}` | DELETE | 删除会话 |
| `/messages` | GET | 获取消息历史 |
| `/messages/{id}/feedbacks` | POST | 消息反馈 |
| `/files/upload` | POST | 文件上传 |
| `/parameters` | GET | 获取应用参数 |
| `/meta` | GET | 获取应用元信息 |
| `/text-to-audio` | POST | 文字转语音 |
| `/audio-to-text` | POST | 语音转文字 |

## 使用说明

- **发送消息** — 输入框输入文字，`Enter` 发送，`Shift+Enter` 换行
- **新建对话** — 点击侧边栏「新建对话」
- **切换会话** — 点击侧边栏会话项
- **删除会话** — 悬停会话项，点击删除图标
- **上传文件** — 点击输入框左侧附件按钮
- **语音输入** — 点击麦克风按钮录音
- **消息操作** — 悬停 AI 回复，可复制 / 朗读 / 点赞 / 点踩

## 技术栈

- HTML / CSS / JavaScript（原生）
- Dify Chat API
- Marked.js（Markdown 渲染）
- Highlight.js（代码高亮）
- MediaRecorder API（录音）

## License

MIT
