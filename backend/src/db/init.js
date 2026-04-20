const bcrypt = require('bcrypt');

function initDb(db) {
  // ── 用户表 ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      role        TEXT    DEFAULT 'user',
      is_disabled INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login  DATETIME
    )
  `);

  // ── 情绪日记表（对齐前端表单字段）────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS mood_records (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL,
      diary_date       TEXT    NOT NULL,
      mood_score       INTEGER NOT NULL,
      dominant_emotion TEXT    NOT NULL,
      emotion_triggers TEXT,
      diary_content    TEXT,
      sleep_quality    INTEGER DEFAULT 0,
      stress_level     INTEGER DEFAULT 0,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ── 知识库分类表 ─────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      parent_id  INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── 知识库文章表 ─────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      category_id INTEGER DEFAULT 0,
      author_name TEXT    DEFAULT '管理员',
      cover       TEXT,
      content     TEXT,
      summary     TEXT,
      tags        TEXT,
      status      INTEGER DEFAULT 0,
      read_count    INTEGER DEFAULT 0,
      dify_doc_id   TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // 旧数据库兼容：若 dify_doc_id 列不存在则补加
  try {
    db.exec('ALTER TABLE articles ADD COLUMN dify_doc_id TEXT');
  } catch (e) { /* 列已存在，忽略 */ }

  // ── AI 复盘笔记表 ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_diary_notes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      note_date       TEXT    NOT NULL,
      conversation_id TEXT,
      summary         TEXT    NOT NULL,
      suggestions     TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ── Refresh Token 表 ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT    UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ── 初始数据 ─────────────────────────────────────────────────────────────
  const admin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')").run([hash]);
    console.log('[DB] 管理员账号已创建: admin / admin123');
  }

  // 预置分类
  const catCount = db.prepare('SELECT COUNT(*) as n FROM categories').get();
  if (catCount.n === 0) {
    const cats = ['情绪管理', '压力应对', '人际关系', '自我成长', '睡眠健康'];
    const ins = db.prepare("INSERT INTO categories (name) VALUES (?)");
    cats.forEach(name => ins.run([name]));
    console.log('[DB] 预置知识库分类完成');
  }
}

module.exports = { initDb };
