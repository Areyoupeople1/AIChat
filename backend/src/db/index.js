const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./init');

const DB_PATH = path.join(__dirname, '../../data.db');
const LOCK_PATH = DB_PATH + '.lock';

// 清理残留锁目录（进程异常退出时不会自动清理）
if (fs.existsSync(LOCK_PATH)) {
  fs.rmSync(LOCK_PATH, { recursive: true, force: true });
  console.log('[DB] 清理残留锁文件');
}

const db = new Database(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');
initDb(db);

module.exports = db;
