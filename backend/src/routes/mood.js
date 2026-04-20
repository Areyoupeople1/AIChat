const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/mood — 新增情绪日记
// body: { diaryDate, moodScore, dominantEmotion, emotionTriggers, diaryContent, sleepQuality, stressLevel }
router.post('/', authMiddleware, (req, res) => {
  const { diaryDate, moodScore, dominantEmotion, emotionTriggers, diaryContent, sleepQuality, stressLevel } = req.body;
  const userId = req.user.id;

  if (!diaryDate || !moodScore || !dominantEmotion) {
    return res.status(400).json({ code: '400', msg: 'diaryDate、moodScore、dominantEmotion 为必填项' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(diaryDate)) {
    return res.status(400).json({ code: '400', msg: 'diaryDate 格式应为 YYYY-MM-DD' });
  }

  const result = db.prepare(`
    INSERT INTO mood_records
      (user_id, diary_date, mood_score, dominant_emotion, emotion_triggers, diary_content, sleep_quality, stress_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run([userId, diaryDate, moodScore, dominantEmotion, emotionTriggers || null, diaryContent || null, sleepQuality || 0, stressLevel || 0]);

  const record = db.prepare('SELECT * FROM mood_records WHERE id = ?').get([result.lastInsertRowid]);
  res.status(201).json({ code: '200', data: record });
});

// GET /api/mood?year=2026&month=4  按月查询当前用户记录
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ code: '400', msg: '请提供 year 和 month 参数' });
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    return res.status(400).json({ code: '400', msg: 'year/month 参数不合法' });
  }

  const prefix = `${y}-${String(m).padStart(2, '0')}`;
  const records = db.prepare(`
    SELECT * FROM mood_records
    WHERE user_id = ? AND diary_date LIKE ?
    ORDER BY diary_date ASC, created_at ASC
  `).all([userId, `${prefix}-%`]);

  res.json({ code: '200', data: records });
});

// POST /api/mood/ai-notes — 保存 AI 复盘笔记
router.post('/ai-notes', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { noteDate, conversationId, summary, suggestions } = req.body;

  if (!noteDate || !summary) {
    return res.status(400).json({ code: '400', msg: 'noteDate 和 summary 不能为空' });
  }

  // 同一天只保留一条，先删再插
  db.prepare('DELETE FROM ai_diary_notes WHERE user_id = ? AND note_date = ?').run([userId, noteDate]);

  const result = db.prepare(`
    INSERT INTO ai_diary_notes (user_id, note_date, conversation_id, summary, suggestions)
    VALUES (?, ?, ?, ?, ?)
  `).run([userId, noteDate, conversationId || null, summary, JSON.stringify(suggestions || [])]);

  const note = db.prepare('SELECT * FROM ai_diary_notes WHERE id = ?').get([result.lastInsertRowid]);
  res.status(201).json({ code: '200', data: note });
});

// GET /api/mood/ai-notes?year=&month= — 查询当月 AI 复盘笔记
router.get('/ai-notes', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ code: '400', msg: '请提供 year 和 month 参数' });
  }

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const notes = db.prepare(`
    SELECT * FROM ai_diary_notes
    WHERE user_id = ? AND note_date LIKE ?
    ORDER BY note_date ASC
  `).all([userId, `${prefix}-%`]);

  // 把 suggestions 从 JSON 字符串还原
  const parsed = notes.map(n => ({
    ...n,
    suggestions: (() => { try { return JSON.parse(n.suggestions || '[]') } catch { return [] } })()
  }));

  res.json({ code: '200', data: parsed });
});

// DELETE /api/mood/:id — 删除自己的记录
router.delete('/:id', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ code: '400', msg: '无效的记录 id' });
  }

  const record = db.prepare('SELECT id, user_id FROM mood_records WHERE id = ?').get([id]);
  if (!record) {
    return res.status(404).json({ code: '404', msg: '记录不存在' });
  }
  if (record.user_id !== userId) {
    return res.status(403).json({ code: '403', msg: '无权删除他人记录' });
  }

  db.prepare('DELETE FROM mood_records WHERE id = ?').run([id]);
  res.json({ code: '200', msg: '删除成功' });
});

module.exports = router;
