import service from "../utils/request";

// ── 认证 ─────────────────────────────────────────────────────────────────────
export function login(data) {
  return service.post('/auth/login', data)
}

export function logout() {
  const refreshToken = localStorage.getItem('refreshToken')
  // 通知服务端使 refresh token 失效（不阻塞，fire-and-forget）
  if (refreshToken) {
    service.post('/auth/logout', { refreshToken }).catch(() => {})
  }
  return Promise.resolve()
}

// ── 用户管理 ─────────────────────────────────────────────────────────────────
export function getAdminUsers() {
  return service.get('/admin/users')
}

export function disableUser(id, data) {
  return service.post(`/admin/users/${id}/disable`, data)
}

export function getUserConversations(id) {
  return service.get(`/admin/users/${id}/conversations`)
}

// ── 知识库分类 ────────────────────────────────────────────────────────────────
export function categoryTree() {
  return service.get('/admin/knowledge/categories')
}

export function createCategory(data) {
  return service.post('/admin/knowledge/categories', data)
}

// ── 知识库文章 ────────────────────────────────────────────────────────────────
export function articlePage(params) {
  // 适配新后端参数名：currentPage → page, category → categoryId
  const { currentPage, size, title, category, status } = params
  const query = { page: currentPage, size }
  if (title)    query.title      = title
  if (category) query.categoryId = category
  if (status !== undefined && status !== '') query.status = status
  return service.get('/admin/knowledge/articles', { params: query })
}

export function getArticleDetail(id) {
  return service.get(`/admin/knowledge/articles/${id}`)
}

export function createArticle(data) {
  return service.post('/admin/knowledge/articles', data)
}

export function updateArticle(id, data) {
  return service.put(`/admin/knowledge/articles/${id}`, data)
}

export function updateArticleStatus(id, data) {
  return service.put(`/admin/knowledge/articles/${id}/status`, data)
}

export function deleteArticle(id) {
  return service.delete(`/admin/knowledge/articles/${id}`)
}

export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return service.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ── 情绪日志管理 ──────────────────────────────────────────────────────────────
export function getEmotionalPage(params) {
  const { currentPage, size, userId } = params
  const query = { page: currentPage || 1, size: size || 10 }
  if (userId) query.username = userId
  return service.get('/admin/mood', { params: query })
}

export function deleteEmotional(id) {
  return service.delete(`/admin/mood/${id}`)
}

// ── 数据统计 ─────────────────────────────────────────────────────────────────
export function getAnalyticsOverview() {
  return service.get('/admin/stats')
}

export function getMoodStats() {
  return service.get('/admin/mood/stats')
}
