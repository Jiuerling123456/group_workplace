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

## 🚀 快速开始

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

浏览器访问 `http://localhost:3000/index.html`，输入论文关键词即可查询。

## 📁 文件结构

```
xhy_paper_consult/
├── index.html    # 前端 UI 界面
├── proxy.py      # 本地代理服务器（解决 CORS 跨域）
└── README.md     # 项目说明
```

## 🔧 技术架构

```
浏览器 (index.html)
    │  POST /api/proxy
    ▼
本地代理 (proxy.py) ─── 解决 CORS + Cloudflare 拦截
    │  POST https://api.dify.ai/v1/workflows/run
    ▼
Dify Workflow API ─── 工作流模式，streaming 响应
```

## ⚠️ 注意事项

- Dify 应用须为 **Workflow（工作流）** 模式
- 工作流需要一个 `keywords` 类型的输入变量
- 使用 `streaming` 响应模式（`blocking` 模式可能超时）

## 📄 License

MIT
