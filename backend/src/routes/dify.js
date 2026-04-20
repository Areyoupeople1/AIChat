const express = require('express');
const axios = require('axios');
const http = require('http');
const authMiddleware = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

function getDifyHeaders() {
  return {
    Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// 用自定义 Agent 彻底绕开系统代理（proxy:false 不够用）
const directAgent = new http.Agent({ keepAlive: false });
const difyAxios = axios.create({ proxy: false, httpAgent: directAgent });

function normalizeCitations(resources = []) {
  const seen = new Map();
  for (const item of resources) {
    const key = item.document_name || item.document_id || item.segment_id;
    const score = item.score ?? 0;
    if (!seen.has(key) || score > seen.get(key).score) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values()).map((item, index) => ({
    id: item.segment_id || item.document_id || `${index}`,
    datasetName: item.dataset_name || '',
    documentName: item.document_name || '',
    content: item.content || '',
    score: item.score ?? null,
  }));
}

function enrichCitations(citations) {
  const stmt = db.prepare('SELECT id FROM articles WHERE title = ? AND status = 1');
  return citations.map(c => {
    if (!c.documentName) return c;
    const row = stmt.get(c.documentName);
    return row ? { ...c, articleId: row.id } : c;
  });
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// POST /api/dify/chat — SSE 流式转发（适配前端事件格式）
router.post('/chat', authMiddleware, async (req, res) => {
  const { query, conversation_id } = req.body;
  const userId = req.user.id;

  if (!query || !query.trim()) {
    return res.status(400).json({ code: '400', msg: 'query 不能为空' });
  }

  const body = {
    inputs: {},
    query,
    response_mode: 'streaming',
    user: `user_${userId}`,
  };
  if (conversation_id) body.conversation_id = conversation_id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    const difyRes = await difyAxios.post(`${process.env.DIFY_BASE_URL}/chat-messages`, body, {
      headers: getDifyHeaders(),
      responseType: 'stream',
      timeout: 0,
    });

    let buffer = '';

    difyRes.data.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const segments = buffer.split('\n\n');
      buffer = segments.pop() || '';

      for (const segment of segments) {
        const dataLine = segment
          .split('\n')
          .find(line => line.startsWith('data: '));

        if (!dataLine) continue;

        const raw = dataLine.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          continue;
        }

        if (payload.event === 'message') {
          writeSse(res, {
            event: 'message',
            answer: payload.answer || '',
            conversation_id: payload.conversation_id,
            message_id: payload.message_id || payload.id,
          });
        }

        if (payload.event === 'message_end') {
          writeSse(res, {
            event: 'message_end',
            conversation_id: payload.conversation_id,
            message_id: payload.message_id || payload.id,
            citations: enrichCitations(normalizeCitations(payload.metadata?.retriever_resources)),
          });
        } 

        if (payload.event === 'error') {
          writeSse(res, {
            event: 'error',
            message: payload.message || 'Dify 服务异常',
          });
        }
      }
    });

    difyRes.data.on('end', () => {
      if (buffer) {
        const dataLine = buffer
          .split('\n')
          .find(line => line.startsWith('data: '));
        if (dataLine) {
          const raw = dataLine.slice(6).trim();
          if (raw && raw !== '[DONE]') {
            try {
              const payload = JSON.parse(raw);
              if (payload.event === 'message_end') {
                writeSse(res, {
                  event: 'message_end',
                  conversation_id: payload.conversation_id,
                  message_id: payload.message_id || payload.id,
                  citations: enrichCitations(normalizeCitations(payload.metadata?.retriever_resources)),
                });
              }
            } catch {}
          }
        }
      }
      res.end();
    });

    difyRes.data.on('error', (err) => {
      console.error('[Dify] 流传输错误:', err.message);
      res.end();
    });
  } catch (err) {
    const status = err.response?.status;
    const rawData = err.response?.data;
    const message = rawData?.message || rawData?.msg || err.message || 'Dify 服务异常';
    console.error('[Dify chat error]', err.code, err.message, status, message);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ event: 'error', message })}\n\n`);
      res.end();
    } else {
      res.status(err.response?.status || 502).json({ code: '502', msg: message });
    }
  }
});

// GET /api/dify/conversations — 获取会话列表
router.get('/conversations', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const { data } = await difyAxios.get(`${process.env.DIFY_BASE_URL}/conversations`, {
      headers: getDifyHeaders(),
      params: { user: `user_${userId}`, limit: 100 },
    });
    // data 是 Dify 原始响应 { data: [...], has_more, limit }
    res.json({ code: '200', data });
  } catch (err) {
    res.status(err.response?.status || 502).json({ code: '502', msg: 'Dify 服务异常' });
  }
});

// GET /api/dify/conversations/:id/messages — 获取会话消息
router.get('/conversations/:id/messages', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;
  try {
    const { data } = await difyAxios.get(`${process.env.DIFY_BASE_URL}/messages`, {
      headers: getDifyHeaders(),
      params: { conversation_id: conversationId, user: `user_${userId}`, limit: 100 },
    });
    res.json({ code: '200', data });
  } catch (err) {
    res.status(err.response?.status || 502).json({ code: '502', msg: 'Dify 服务异常' });
  }
});

// POST /api/dify/conversations/:id/summary — 生成会话复盘（blocking 模式）
router.post('/conversations/:id/summary', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  try {
    // 1. 拉取会话消息
    const { data: msgData } = await difyAxios.get(`${process.env.DIFY_BASE_URL}/messages`, {
      headers: getDifyHeaders(),
      params: { conversation_id: conversationId, user: `user_${userId}`, limit: 50 },
    });

    const messages = msgData.data || [];
    if (messages.length === 0) {
      return res.status(400).json({ code: '400', msg: '该会话暂无消息记录' });
    }

    // 2. 拼接对话文本
    const transcript = messages
      .map(m => `用户：${m.query}\nAI：${m.answer}`)
      .join('\n\n');

    // 3. 调 Dify blocking 模式生成复盘
    const { data: result } = await difyAxios.post(
      `${process.env.DIFY_BASE_URL}/chat-messages`,
      {
        inputs: {},
        query: `你是一位专业的心理健康顾问。请对以下咨询对话进行复盘分析，严格按格式回复：\n【总结】\n用2-3句话概括本次对话的主题和用户的情绪状态。\n【建议】\n1. 第一条具体可执行的改善建议\n2. 第二条具体可执行的改善建议\n3. 第三条具体可执行的改善建议\n\n对话记录：\n${transcript}`,
        response_mode: 'blocking',
        user: `summary_${userId}_${Date.now()}`,
      },
      { headers: getDifyHeaders(), timeout: 30000 }
    );

    // 4. 解析纯文本格式
    const answer = result.answer || '';
    const summaryMatch = answer.match(/【总结】\s*([\s\S]*?)(?=【建议】|$)/);
    const suggestionsMatch = answer.match(/【建议】\s*([\s\S]*?)$/);

    const summary = summaryMatch ? summaryMatch[1].trim() : answer;
    const suggestions = suggestionsMatch
      ? suggestionsMatch[1].split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
      : [];

    res.json({ code: '200', data: { summary, suggestions } });
  } catch (err) {
    const message = err.response?.data?.message || err.message || 'Dify 服务异常';
    console.error('[Summary error]', message);
    res.status(err.response?.status || 502).json({ code: '502', msg: message });
  }
});

// PATCH /api/dify/conversations/:id/name — 重命名会话
router.patch('/conversations/:id/name', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ code: '400', msg: 'name 不能为空' });
  try {
    await difyAxios.post(
      `${process.env.DIFY_BASE_URL}/conversations/${conversationId}/name`,
      { name, user: `user_${userId}` },
      { headers: getDifyHeaders() }
    );
    res.json({ code: '200', data: null });
  } catch (err) {
    res.status(err.response?.status || 502).json({ code: '502', msg: 'Dify 服务异常' });
  }
});

// DELETE /api/dify/conversations/:id — 删除会话
router.delete('/conversations/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;
  try {
    await difyAxios.delete(`${process.env.DIFY_BASE_URL}/conversations/${conversationId}`, {
      headers: getDifyHeaders(),
      data: { user: `user_${userId}` },
    });
    res.json({ code: '200', msg: '删除成功' });
  } catch (err) {
    res.status(err.response?.status || 502).json({ code: '502', msg: 'Dify 服务异常' });
  }
});

module.exports = router;
