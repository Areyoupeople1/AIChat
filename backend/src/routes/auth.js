const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── 工具函数 ──────────────────────────────────────────────────────────────

/** 生成 access token（15分钟） */
function signAccess(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/** 生成 refresh token 并写入 DB，返回 token 字符串 */
function createRefreshToken(userId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run([userId, token, expiresAt]);
  return token;
}

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: '400', msg: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ code: '400', msg: '用户名长度为2-20个字符' });
  }
  if (password.length < 6) {
    return res.status(400).json({ code: '400', msg: '密码长度不能少于6位' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get([username]);
  if (existing) {
    return res.status(409).json({ code: '409', msg: '用户名已存在' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')")
    .run([username, hash]);

  const user = { id: result.lastInsertRowid, username, role: 'user' };
  const accessToken = signAccess(user);
  const refreshToken = createRefreshToken(user.id);

  res.status(201).json({ code: '200', data: { accessToken, refreshToken, user } });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: '400', msg: '用户名和密码不能为空' });
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get([username]);
  if (!row) {
    return res.status(401).json({ code: '401', msg: '用户名或密码错误' });
  }
  if (row.is_disabled) {
    return res.status(403).json({ code: '403', msg: '账号已被禁用，请联系管理员' });
  }

  const match = bcrypt.compareSync(password, row.password);
  if (!match) {
    return res.status(401).json({ code: '401', msg: '用户名或密码错误' });
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run([row.id]);

  const user = { id: row.id, username: row.username, role: row.role };
  const accessToken = signAccess(user);
  const refreshToken = createRefreshToken(user.id);

  res.json({ code: '200', data: { accessToken, refreshToken, user } });
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────
// body: { refreshToken }
// 返回新的 accessToken，同时 rotate refreshToken（旧的作废，发新的）
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ code: '400', msg: 'refreshToken 不能为空' });
  }

  const row = db.prepare(
    "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')"
  ).get([refreshToken]);

  if (!row) {
    return res.status(401).json({ code: '401', msg: 'refresh token 无效或已过期，请重新登录' });
  }

  // Refresh Token Rotation：删旧的，签新的
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run([row.id]);

  const userRow = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get([row.user_id]);
  if (!userRow || userRow.is_disabled) {
    return res.status(403).json({ code: '403', msg: '账号不可用' });
  }

  const newAccessToken = signAccess(userRow);
  const newRefreshToken = createRefreshToken(userRow.id);

  res.json({ code: '200', data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────
// body: { refreshToken }  — 删除服务端 refresh token，真正失效
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run([refreshToken]);
  }
  res.json({ code: '200', data: null });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const row = db
    .prepare('SELECT id, username, role FROM users WHERE id = ?')
    .get([req.user.id]);
  if (!row) {
    return res.status(404).json({ code: '404', msg: '用户不存在' });
  }
  res.json({ code: '200', data: row });
});

module.exports = router;
