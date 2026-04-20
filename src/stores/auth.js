import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'

export const useAuthStore = defineStore('auth', () => {
  // ── state ──────────────────────────────────────────────────────────────
  const accessToken = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const userInfo = ref((() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || null }
    catch { return null }
  })())

  // ── getters ────────────────────────────────────────────────────────────
  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  // ── actions ────────────────────────────────────────────────────────────
  function setTokens(aToken, rToken) {
    accessToken.value = aToken
    refreshToken.value = rToken
    localStorage.setItem('token', aToken)
    localStorage.setItem('refreshToken', rToken)
  }

  function setUser(user) {
    userInfo.value = user
    localStorage.setItem('userInfo', JSON.stringify(user))
  }

  function clearAuth() {
    accessToken.value = ''
    refreshToken.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
  }

  async function login(username, password) {
    const data = await request.post('/auth/login', { username, password })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return data.user
  }

  async function register(username, password) {
    const data = await request.post('/auth/register', { username, password })
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return data.user
  }

  async function logout() {
    try {
      await request.post('/auth/logout', { refreshToken: refreshToken.value })
    } catch {}
    clearAuth()
  }

  return {
    accessToken, refreshToken, userInfo,
    isLoggedIn, isAdmin,
    setTokens, setUser, clearAuth,
    login, register, logout,
  }
})
