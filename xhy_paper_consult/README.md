# 📄 xhy_paper_consult - 论文查询系统

基于 **Dify Workflow API** 的学术论文智能检索前端，输入关键词即可查询相关论文。

## ✨ 功能特性

- 🔍 **关键词搜索** — 流式调用 Dify 工作流，实时返回论文结果
- 📚 **论文卡片展示** — 标题、作者、年份、期刊、摘要、关键词标签
- 🔗 **原文链接** — 支持 DOI/URL 跳转
- 📋 **一键复制** — 单篇论文快速复制
- 📥 **批量导出** — 将查询结果导出为 TXT 文件
- 📋 **搜索历史** — localStorage 保存最近 20 条搜索记录
- ⏱ **计时器** — 显示查询实时耗时
- ☁️ **Vercel 部署** — 支持一键部署到 Vercel

## 🚀 本地运行

### 1. 安装依赖

需要 Python 3.6+，无需额外安装第三方库。

### 2. 配置 API

编辑 `proxy.py`，填入你的 Dify API 信息：

```python
DIFY_URL = 'https://api.dify.ai/v1/workflows/run'
API_KEY = 'your-api-key-here'
```

### 3. 启动代理服务器

```bash
python proxy.py
```

服务器将在 `http://localhost:3000` 启动。

### 4. 打开前端页面

浏览器访问 `http://localhost:3000`，输入论文关键词即可查询。

## ☁️ Vercel 一键部署

### 方法一：通过 GitHub 导入

1. **Fork 本项目** 或上传到你的 GitHub 仓库
2. 访问 **[Vercel Dashboard](https://vercel.com/dashboard)**
3. 点击 **"New Project"** → **"Import Git Repository"**
4. 选择你的 GitHub 仓库
5. 在 **"Environment Variables"** 中添加：
   ```
   DIFY_API_KEY = your-dify-api-key
   ```
6. 点击 **"Deploy"**

### 方法二：Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署项目
vercel --prod
```

### 环境变量配置

在 Vercel 项目设置中添加：

| 变量名 | 值 | 必填 |
|--------|-----|------|
| `DIFY_API_KEY` | 你的 Dify API Key | ✅ |

## 📁 文件结构

```
xhy_paper_consult/
├── index.html              # 前端 UI 界面
├── proxy.py                # 本地开发代理服务器
├── api/paper-proxy.js      # Vercel Serverless Function
├── package.json            # Node.js 项目配置
├── vercel.json             # Vercel 部署配置
├── .env.local              # 本地环境变量（示例）
├── test-vercel.js          # Vercel 本地测试服务器
└── README.md               # 项目说明
```

## 🔧 技术架构

### 本地开发模式
```
浏览器 (index.html)
    │  POST /api/proxy
    ▼
本地代理 (proxy.py) ─── 解决 CORS + 代理 Dify API
    │  POST https://api.dify.ai/v1/workflows/run
    ▼
Dify Workflow API ─── 工作流模式，streaming 响应
```

### Vercel 生产模式
```
浏览器 (index.html)
    │  POST /api/paper-proxy
    ▼
Vercel Serverless Function ─── 无服务器代理
    │  POST https://api.dify.ai/v1/workflows/run
    ▼
Dify Workflow API ─── 工作流模式，streaming 响应
```

## ⚠️ 注意事项

1. **Dify 应用配置**：
   - 必须是 **Workflow（工作流）** 模式
   - 工作流需要一个 `keywords` 类型的输入变量
   - 使用 `streaming` 响应模式（`blocking` 模式可能超时）

2. **API Key 安全**：
   - 本地开发：编辑 `proxy.py` 中的 `API_KEY`
   - Vercel 部署：在 Vercel Dashboard 中添加 `DIFY_API_KEY` 环境变量

3. **跨域问题**：
   - 本地开发使用 Python 代理解决 CORS
   - Vercel 部署通过 Serverless Function 自动处理

## 📄 License

MIT
