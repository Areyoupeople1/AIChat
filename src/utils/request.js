import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

// ── 并发刷新控制 ─────────────────────────────────────────────────────────────
// 多个请求同时 401 时，只发一次 /refresh，其余请求排队等结果
let isRefreshing = false
let waitQueue = [] // [{ resolve, reject }]

function onRefreshed(newToken) {
  waitQueue.forEach(({ resolve }) => resolve(newToken))
  waitQueue = []
}
function onRefreshFailed() {
  waitQueue.forEach(({ reject }) => reject())
  waitQueue = []
}

// ── 请求拦截器 ───────────────────────────────────────────────────────────────
service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['token'] = token
    }
    return config
  },
  error => Promise.reject(error)
)

// ── 响应拦截器 ───────────────────────────────────────────────────────────────
service.interceptors.response.use(
  response => {
    const { data } = response
    if (data.code === '200') {
      return data.data
    }
    ElMessage.error(data.msg || '请求失败')
    return Promise.reject(new Error(data.msg || '请求失败'))
  },
  async error => {
    const originalConfig = error.config

    // 401 且不是 /auth/refresh 本身（避免死循环）
    if (
      error.response?.status === 401 &&
      !originalConfig._retry &&
      !originalConfig.url?.includes('/auth/refresh') &&
      !originalConfig.url?.includes('/auth/login')
    ) {
      const storedRefreshToken = localStorage.getItem('refreshToken')

      if (!storedRefreshToken) {
        redirectLogin()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // 已有刷新进行中：把当前请求加入等待队列
        return new Promise((resolve, reject) => {
          waitQueue.push({ resolve, reject })
        }).then(newToken => {
          originalConfig.headers['token'] = newToken
          return service(originalConfig)
        }).catch(() => {
          redirectLogin()
          return Promise.reject(error)
        })
      }

      // 本请求负责刷新 token
      originalConfig._retry = true
      isRefreshing = true

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken: storedRefreshToken })
        const { accessToken, refreshToken } = res.data.data

        localStorage.setItem('token', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        // 通知排队的请求
        onRefreshed(accessToken)

        // 重试本次请求
        originalConfig.headers['token'] = accessToken
        return service(originalConfig)
      } catch {
        onRefreshFailed()
        redirectLogin()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

function redirectLogin() {
  ElMessage.error('登录已过期，请重新登录')
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('userInfo')
  window.location.href = '/auth/login'
}

export default service
