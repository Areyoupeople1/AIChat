README

- 项目名称 + 一句话简介（心理健康 AI 助手：对话 + RAG 知识库 + 情绪日记复盘闭环）
- 功能特性（AI 对话 SSE 流式、RAG 引用卡片、情绪日记/AI 月度复盘、双 Token 鉴权与并发刷新、后台文章管理与同步 Dify）
- 技术栈（Vue3/Vite/Element Plus/Pinia；Node/Express/SQLite；Dify）
- 架构概览（前端 → /api 代理 → Express → Dify；SQLite 持久化；SSE 流）
- 快速开始（本地）
  - 前端： npm i + npm run dev （5173）
  - 后端： cd backend + npm i + npm run dev （3000）
  - 说明 Vite proxy /api -> http://localhost:3000
- 环境变量（backend/.env 需要的键： JWT_SECRET 、 PORT 、 DIFY_BASE_URL 、 DIFY_API_KEY 、 DIFY_DATASET_ID 、 DIFY_DATASET_API_KEY ）
- 默认账号（仅本地开发）： admin / admin123 ，并强调上线必须修改
- 目录结构（root 前端 + backend 后端的关键目录）
- 常见问题（Dify 连接失败、CORS/代理、数据库 data.db、上传目录）
- 免责声明（非医疗建议等）
