import service from "../utils/request";

// ── 用户认证 ─────────────────────────────────────────────────────────────────
export function register(data) {
  return service.post('/auth/register', { username: data.username, password: data.password })
}

// ── Dify 对话 ─────────────────────────────────────────────────────────────────
// 注意：sendChat 使用 fetchEventSource 直接发起，不走此 service
// 下面三个是会话管理接口

export function getConversationList() {
  return service.get('/dify/conversations')
}

export function getConversationMessages(conversationId) {
  return service.get(`/dify/conversations/${conversationId}/messages`)
}

export function deleteConversation(conversationId) {
  return service.delete(`/dify/conversations/${conversationId}`)
}

export function renameConversation(conversationId, name) {
  return service.patch(`/dify/conversations/${conversationId}/name`, { name })
}

// LLM 生成总结需要较长时间，覆盖全局 5s timeout
export function generateConversationSummary(conversationId) {
  return service.post(`/dify/conversations/${conversationId}/summary`, {}, { timeout: 60000 })
}

export function saveAiNote(data) {
  return service.post('/mood/ai-notes', data, { timeout: 10000 })
}

export function getAiNotes(params) {
  return service.get('/mood/ai-notes', { params })
}

// ── 情绪日记 ─────────────────────────────────────────────────────────────────
export function addMoodRecord(data) {
  return service.post('/mood', data)
}

export function getMoodRecords(params) {
  return service.get('/mood', { params })
}

export function deleteMoodRecord(id) {
  return service.delete(`/mood/${id}`)
}

// ── 知识库（公开）────────────────────────────────────────────────────────────
export function getKnowledgeList(params) {
  // 适配分页参数名：currentPage → page
  const { currentPage, size, ...rest } = params
  return service.get('/knowledge/articles', {
    params: { page: currentPage || 1, size: size || 10, ...rest }
  })
}

export function getKnowledgeDetail(articleId) {
  return service.get(`/knowledge/articles/${articleId}`)
}

export function getKnowledgeCategories() {
  return service.get('/knowledge/categories')
}
