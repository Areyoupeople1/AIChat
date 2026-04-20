const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/knowledge/categories — 分类树（公开）
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json({ code: '200', data: cats });
});

// GET /api/knowledge/articles?page=1&size=10&title=&categoryId=
router.get('/articles', (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page  || '1',  10));
  const size     = Math.max(1, parseInt(req.query.size  || '10', 10));
  const title    = req.query.title      || '';
  const catId    = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;

  const conditions = ["a.status = 1"]; // 只返回已发布的
  const params = [];

  if (title) {
    conditions.push("a.title LIKE ?");
    params.push(`%${title}%`);
  }
  if (catId) {
    conditions.push("a.category_id = ?");
    params.push(catId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * size;

  const totalStmt = db.prepare(`SELECT COUNT(*) as n FROM articles a ${where}`);
  const total = params.length ? totalStmt.get(params).n : totalStmt.get().n;

  const records = db.prepare(
    `SELECT a.id, a.title, a.category_id, c.name as category_name,
            a.author_name, a.cover, a.summary, a.tags, a.read_count, a.created_at, a.updated_at
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     ${where} ORDER BY a.updated_at DESC LIMIT ? OFFSET ?`
  ).all([...params, size, offset]);

  res.json({ code: '200', data: { records, total, page, size } });
});

// GET /api/knowledge/articles/:id — 文章详情（公开），同时累加阅读数
router.get('/articles/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ code: '400', msg: '无效的文章 id' });

  const article = db.prepare(`
    SELECT a.*, c.name as category_name
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = ? AND a.status = 1
  `).get([id]);
  if (!article) return res.status(404).json({ code: '404', msg: '文章不存在' });

  db.prepare('UPDATE articles SET read_count = read_count + 1 WHERE id = ?').run([id]);

  res.json({ code: '200', data: article });
});

module.exports = router;
