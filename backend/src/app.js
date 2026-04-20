require('dotenv').config();

// Dify 部署在本地，清掉系统代理避免 axios 请求被劫持
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRouter      = require('./routes/auth');
const moodRouter      = require('./routes/mood');
const difyRouter      = require('./routes/dify');
const adminRouter     = require('./routes/admin');
const knowledgeRouter = require('./routes/knowledge');

const app = express();

// ── 跨域 ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// ── 解析 JSON ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // 富文本内容可能较大

// ── 静态文件（文章封面图）────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── 路由挂载 ─────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/mood',      moodRouter);
app.use('/api/dify',      difyRouter);
app.use('/api/admin',     adminRouter);
app.use('/api/knowledge', knowledgeRouter);

// ── 健康检查 ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 全局错误处理 ──────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  // multer 文件类型错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: '400', msg: '文件大小不能超过 5MB' });
  }
  res.status(500).json({ code: '500', msg: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] 运行在 http://localhost:${PORT}`);
});
