const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const axios   = require('axios');
const db      = require('../db');
const { createDocument, updateDocument, deleteDocument } = require('../utils/difyDataset');
const authMiddleware  = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

// ── 文件上传配置 ────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(file.mimetype));
  }
});

function difyHeaders() {
  return { Authorization: `Bearer ${process.env.DIFY_API_KEY}`, 'Content-Type': 'application/json' };
}

// ════════════════════════════════════════════════════════════════════════════
// 文件上传
// POST /api/admin/upload
// ════════════════════════════════════════════════════════════════════════════
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: '400', msg: '请上传图片文件' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ code: '200', data: { url } });
});

// ════════════════════════════════════════════════════════════════════════════
// 用户管理
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.prepare(
    "SELECT id, username, role, is_disabled, created_at, last_login FROM users ORDER BY created_at DESC"
  ).all();
  res.json({ code: '200', data: users });
});

// POST /api/admin/users/:id/disable
router.post('/users/:id/disable', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { is_disabled } = req.body;

  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的用户 id' });
  if (is_disabled !== 0 && is_disabled !== 1) {
    return res.status(400).json({ code: '400', msg: 'is_disabled 必须为 0 或 1' });
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get([id]);
  if (!user) return res.status(404).json({ code: '404', msg: '用户不存在' });
  if (user.role === 'admin') return res.status(403).json({ code: '403', msg: '不能禁用管理员账号' });

  db.prepare('UPDATE users SET is_disabled = ? WHERE id = ?').run([is_disabled, id]);
  res.json({ code: '200', msg: is_disabled ? '用户已禁用' : '用户已启用' });
});

// GET /api/admin/users/:id/conversations — 查看某用户的 Dify 会话
router.get('/users/:id/conversations', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的用户 id' });

  try {
    const { data } = await axios.get(`${process.env.DIFY_BASE_URL}/conversations`, {
      headers: difyHeaders(),
      params: { user: `user_${id}`, limit: 100 }
    });
    res.json({ code: '200', data });
  } catch (err) {
    res.status(err.response?.status || 502).json({ code: '502', msg: 'Dify 服务异常' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 知识库分类管理
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/knowledge/categories
router.get('/knowledge/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json({ code: '200', data: cats });
});

// POST /api/admin/knowledge/categories
router.post('/knowledge/categories', (req, res) => {
  const { name, parent_id = 0, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ code: '400', msg: '分类名称不能为空' });
  const result = db.prepare(
    'INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)'
  ).run([name, parent_id, sort_order]);
  res.status(201).json({ code: '200', data: { id: result.lastInsertRowid, name } });
});

// ════════════════════════════════════════════════════════════════════════════
// 知识库文章管理
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/knowledge/articles?page=1&size=10&title=&categoryId=&status=
router.get('/knowledge/articles', (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
  const size   = Math.max(1, parseInt(req.query.size  || '10', 10));
  const title  = req.query.title  || '';
  const catId  = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
  const status = req.query.status !== undefined ? parseInt(req.query.status, 10) : null;

  const conditions = [];
  const params = [];

  if (title)  { conditions.push('title LIKE ?');      params.push(`%${title}%`); }
  if (catId !== null) { conditions.push('category_id = ?'); params.push(catId); }
  if (status !== null) { conditions.push('status = ?');     params.push(status); }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * size;

  const totalStmt = db.prepare(`SELECT COUNT(*) as n FROM articles ${where}`);
  const total = params.length ? totalStmt.get(params).n : totalStmt.get().n;

  const records = db.prepare(
    `SELECT id, title, category_id, author_name, cover, summary, tags, status, read_count, created_at, updated_at
     FROM articles ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).all([...params, size, offset]);

  res.json({ code: '200', data: { records, total, page, size } });
});

// GET /api/admin/knowledge/articles/:id
router.get('/knowledge/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的文章 id' });
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get([id]);
  if (!article) return res.status(404).json({ code: '404', msg: '文章不存在' });
  res.json({ code: '200', data: article });
});

// POST /api/admin/knowledge/articles
router.post('/knowledge/articles', async (req, res) => {
  const { title, category_id = 0, author_name = '管理员', cover, content, summary, tags } = req.body;
  if (!title) return res.status(400).json({ code: '400', msg: '文章标题不能为空' });

  const result = db.prepare(`
    INSERT INTO articles (title, category_id, author_name, cover, content, summary, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run([title, category_id, author_name, cover || null, content || null, summary || null, tags || null]);

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get([result.lastInsertRowid]);

  // 同步到 Dify 知识库（异步，失败不影响主流程）
  createDocument(article).then(difyDocId => {
    if (difyDocId) {   db.prepare('UPDATE articles SET dify_doc_id = ? WHERE id = ?').run([difyDocId, article.id]);
   
    }
  }).catch(e => console.error('[Dify] 同步新增文章失败:', e.message));

  res.status(201).json({ code: '200', data: article });
});

// PUT /api/admin/knowledge/articles/:id
router.put('/knowledge/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的文章 id' });

  const { title, category_id, author_name, cover, content, summary, tags } = req.body;
  if (!title) return res.status(400).json({ code: '400', msg: '文章标题不能为空' });

  db.prepare(`
    UPDATE articles
    SET title = ?, category_id = ?, author_name = ?, cover = ?, content = ?, summary = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run([title, category_id || 0, author_name || '管理员', cover || null, content || null, summary || null, tags || null, id]);

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get([id]);
  if (!article) return res.status(404).json({ code: '404', msg: '文章不存在' });

  // 同步到 Dify 知识库
  if (article.dify_doc_id) {
    updateDocument(article.dify_doc_id, article)
      .catch(e => console.error('[Dify] 同步更新文章失败:', e.message));
  } else {
    createDocument(article).then(difyDocId => {
      if (difyDocId) db.prepare('UPDATE articles SET dify_doc_id = ? WHERE id = ?').run([difyDocId, id]);
    }).catch(e => console.error('[Dify] 同步更新文章失败(create):', e.message));
  }

  res.json({ code: '200', data: article });
});

// POST /api/admin/knowledge/sync-dify — 把所有没有 dify_doc_id 的文章同步到 Dify
router.post('/knowledge/sync-dify', async (req, res) => {
  const articles = db.prepare('SELECT * FROM articles WHERE dify_doc_id IS NULL').all();
  const results = [];
  for (const article of articles) {
    try {
      const difyDocId = await createDocument(article);
      if (difyDocId) {
        db.prepare('UPDATE articles SET dify_doc_id = ? WHERE id = ?').run([difyDocId, article.id]);
        results.push({ id: article.id, title: article.title, status: 'ok' });
      }
    } catch (e) {
      results.push({ id: article.id, title: article.title, status: 'fail', error: e.message });
    }
  }
  res.json({ code: '200', data: { synced: results.length, results } });
});

// PUT /api/admin/knowledge/articles/:id/status
// body: { status: 0(草稿) | 1(发布) | 2(下线) }
router.put('/knowledge/articles/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的文章 id' });
  if (![0, 1, 2].includes(status)) return res.status(400).json({ code: '400', msg: 'status 须为 0/1/2' });

  db.prepare('UPDATE articles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run([status, id]);
  res.json({ code: '200', msg: '状态已更新' });
});

// DELETE /api/admin/knowledge/articles/:id
router.delete('/knowledge/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的文章 id' });
  const article = db.prepare('SELECT id, dify_doc_id FROM articles WHERE id = ?').get([id]);
  if (!article) return res.status(404).json({ code: '404', msg: '文章不存在' });
  db.prepare('DELETE FROM articles WHERE id = ?').run([id]);

  // 同步删除 Dify 文档
  if (article.dify_doc_id) {
    deleteDocument(article.dify_doc_id)
      .catch(e => console.error('[Dify] 同步删除文章失败:', e.message));
  }

  res.json({ code: '200', msg: '删除成功' });
});

// ════════════════════════════════════════════════════════════════════════════
// 情绪日志管理
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/mood?page=1&size=10&username=
router.get('/mood', (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page || '1',  10));
  const size     = Math.max(1, parseInt(req.query.size || '10', 10));
  const username = req.query.username || '';

  const conditions = [];
  const params = [];
  if (username) {
    conditions.push('u.username LIKE ?');
    params.push(`%${username}%`);
  }

  const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * size;

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as n FROM mood_records m
    LEFT JOIN users u ON m.user_id = u.id ${where}
  `);
  const total = params.length ? totalStmt.get(params).n : totalStmt.get().n;

  const records = db.prepare(`
    SELECT m.*, u.username
    FROM mood_records m
    LEFT JOIN users u ON m.user_id = u.id
    ${where}
    ORDER BY m.diary_date DESC, m.created_at DESC
    LIMIT ? OFFSET ?
  `).all([...params, size, offset]);

  res.json({ code: '200', data: { records, total, page, size } });
});

// DELETE /api/admin/mood/:id
router.delete('/mood/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的记录 id' });
  const record = db.prepare('SELECT id FROM mood_records WHERE id = ?').get([id]);
  if (!record) return res.status(404).json({ code: '404', msg: '记录不存在' });
  db.prepare('DELETE FROM mood_records WHERE id = ?').run([id]);
  res.json({ code: '200', msg: '删除成功' });
});

// ════════════════════════════════════════════════════════════════════════════
// 数据概览（Dashboard）
// GET /api/admin/stats
// 返回: { totalUsers, todayNewUsers, totalMoodRecords, todayNewMoodRecords, avgMoodScore }
// ════════════════════════════════════════════════════════════════════════════
router.get('/stats', (req, res) => {
  const { totalUsers } = db.prepare(
    "SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'"
  ).get();

  const { todayNewUsers } = db.prepare(
    "SELECT COUNT(*) as todayNewUsers FROM users WHERE role = 'user' AND date(created_at) = date('now')"
  ).get();

  const { totalMoodRecords } = db.prepare(
    'SELECT COUNT(*) as totalMoodRecords FROM mood_records'
  ).get();

  const { todayNewMoodRecords } = db.prepare(
    "SELECT COUNT(*) as todayNewMoodRecords FROM mood_records WHERE date(created_at) = date('now')"
  ).get();

  const { avgMoodScore } = db.prepare(
    'SELECT ROUND(AVG(mood_score), 1) as avgMoodScore FROM mood_records'
  ).get();

  const { totalArticles } = db.prepare(
    "SELECT COUNT(*) as totalArticles FROM articles WHERE status = 1"
  ).get();

  res.json({
    code: '200',
    data: {
      totalUsers,
      todayNewUsers,
      totalMoodRecords,
      todayNewMoodRecords,
      avgMoodScore: avgMoodScore || 0,
      totalArticles,
    }
  });
});

// GET /api/admin/mood/stats — 图表数据（ECharts）
router.get('/mood/stats', (req, res) => {
  // 各情绪占比
  const emotionDistribution = db.prepare(
    'SELECT dominant_emotion as emotion, COUNT(*) as count FROM mood_records GROUP BY dominant_emotion ORDER BY count DESC'
  ).all();

  // 近30天每日平均情绪分（字段名对齐前端）
  const moodTrend = db.prepare(`
    SELECT diary_date as date,
           ROUND(AVG(mood_score), 1) as avgMoodScore,
           COUNT(*) as recordCount
    FROM mood_records
    WHERE diary_date >= date('now', '-30 days')
    GROUP BY diary_date
    ORDER BY diary_date ASC
  `).all();

  // 文章分类分布
  const articleByCategory = db.prepare(`
    SELECT c.name as category, COUNT(a.id) as count
    FROM categories c
    LEFT JOIN articles a ON a.category_id = c.id AND a.status = 1
    GROUP BY c.id, c.name
    ORDER BY count DESC
  `).all();

  res.json({ code: '200', data: { emotionDistribution, moodTrend, articleByCategory } });
});

module.exports = router;
