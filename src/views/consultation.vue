<template>
  <div class="consultation-container">
    <div class="sidebar">
      <!-- AI助手信息 -->
      <div class="ai-assistant-info">
        <div class="breathing-circle">
          <el-image :src="iconUrl" style="width: 25px; height: 25px;" Alt="AI助手" />
        </div>
        <h3 class="assistant-name">AI助手</h3>
        <div class="online-status">
          <div class="status-dot"></div>
          在线服务中
        </div>
      </div>
      <!-- 情绪花园 -->
      <div class="emotion-garden">
        <div class="garden-header">
          <div class="garden-title">
            <el-icon>
              <Sunny />
            </el-icon>
            情绪花园
          </div>
        </div>

        <div class="emotion-info">
          <div class="emotion-name">中性</div>
          <div class="emotion-score">{{ currentEmotion.emotionScore || 50 }}</div>
        </div>

        <div class="warm-tips">
          <div class="emotion-status-text">
            <span class="status-label">今天感觉</span>
            <span class="status-emotion" style="background: linear-gradient(135deg, #ff9a9e, #fecfef); color: white;">
              {{ (currentEmotion.isNegative || false) ? '需要关注' : '很不错' }}
            </span>
          </div>
          <!-- //情绪等级 -->
          <div class="emotion-intensity">
            <div class="intensity-dots">
              <span v-for="ii in 3" :key="ii" class="dot"
                :class="{ 'active': getEmotionIntensityClass(currentEmotion.emotionScore || 50) >= ii }"></span>
            </div>
            <span class="intensity-text">{{
              getRiskLevelText(currentEmotion.riskLevel || 0)
              }}</span>
          </div>
          <!-- //小建议 -->
          <div class="warm-suggestion" v-if="currentEmotion.suggestion">
            <div class="suggestion-icon">💝</div>
            <div class="suggestion-content">
              <div class="suggestion-title">给你的小建议</div>
              <div class="suggestion-text">{{ currentEmotion.suggestion }}</div>
            </div>
          </div>

          <!-- //治愈小行动 -->
          <div class="healing-actions">
            <div class=" actions-title">治愈小行动</div>
            <div class="actions-list">
              <div class="action-item" v-for="action in currentEmotion.improvementSuggestions" :key="action">
                <div class="action-icon">✨</div>
                <div class="action-text">{{ action }}</div>
              </div>
            </div>
          </div>

          <!-- //风险提示 只有负面情绪出现时 才会出现 -->
          <div class="risk-notice" v-if="(currentEmotion.isNegative || false) && (currentEmotion.riskLevel || 0) > 1">
            <div class="notice-icon">🤗</div>
            <div class="notice-content">
              <div class="notice-title">温馨提示</div>
              <div class="notice-text">{{ currentEmotion.riskDescription || '' }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- //会话历史  -->
      <div class="session-history">
        <h4 class="section-title"><span>会话历史</span></h4>
        <div class="session-list">
          <div class="session-item" v-for="session in sessionList" :key="session.id"
            @click="handleSessionClick(session)">
            <div class="session-info">
              <div class="session-title">
                <span>{{ session.sessionTitle }}</span>
                <div class="session-meta">
                  <span class="session-time">{{ session.startedAt }}</span>
                </div>
                <div class="session-preview">
                  <span class="session-time">{{ session.lastMessageContent }}</span>
                </div>
                <div class="session-stats">
                  <span>
                    <el-icon class="session-count-icon" color="#ff6b6b">
                      <ChatRound />
                    </el-icon>{{
                      session.messageCount || 0
                    }}
                  </span>

                  <span>
                    <el-icon class="session-count-icon" color="#ff6b6b">
                      <Clock />
                    </el-icon>{{
                      session.durationMinutes || 0
                    }}
                  </span>
                </div>
              </div>

              <div class="session-actions">
                <el-button text type="danger" size="small" @click="handleSessionDelete(session.id)">
                  <el-icon size="16">
                    <DeleteFilled />
                  </el-icon>
                </el-button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- <div class="no-sessions-text" v-if="sessionList.length === 0">暂无会话记录</div> -->
    </div>

    <div class="chat-main">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-left">
          <div class="chat-avatar">
            <el-image :src="likeIconUrl" style="height: 30px; width: 30px" />
          </div>
          <div class="chat-info">
            <h2>AI助手</h2>
            <p>您的贴心AI心理健康助手</p>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <!-- 停止生成按钮：仅在 AI 输出时显示 -->
          <el-button v-if="isAiTyping" circle type="danger" @click="stopGeneration" title="停止生成">
            <el-icon size="20"><VideoPause /></el-icon>
          </el-button>
          <!-- 生成复盘：有会话且 AI 不在输出时才可用 -->
          <el-button v-if="currentConversationId && !isAiTyping" @click="openSummaryDialog"
            :loading="summaryLoading" title="生成今日复盘" size="small" type="success" plain>
            📝 今日复盘
          </el-button>
          <el-button circle @click="createNewSession" title="新建对话">
            <el-icon size="20"><Plus /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 聊天消息区域 -->
      <div class="chat-messages" ref="messagesContainer">
        <!-- 没有之前的会话长度的时候才显示默认内容 -->
        <div class="message-item ai-message" v-if="messages.length === 0">
          <div class="message-avatar">
            <el-image :src="iconUrl" style="height: 30px; width: 30px" />
          </div>
          <div class="message-content">
            <div class="message-bubble">
              <p>您好！我是小暖，您的AI心理健康助手。很高兴陪伴您，为您提供温暖的心理支持。请告诉我，今天您感觉怎么样？有什么想要分享的吗？</p>
            </div>
            <div class="message-time">刚刚</div>
          </div>
        </div>

        <!--消息列表-->
        <div v-else v-for="msg in messages" :key="msg.id" class="message-item"
          :class="{ 'ai-message': msg.senderType === 2, 'user-message': msg.senderType === 1 }">
          <div class="message-avatar">
            <el-image :src="msg.senderType === 1 ? usersIconUrl : iconUrl" style="height: 30px; width: 30px" />
          </div>
          <div class="message-content">
            <div class="message-bubble">

              <!--AI正在思考中-->
              <div class="typing-indicator" v-if="msg.senderType === 2 && isAiTyping && !msg.content">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>

              <!--AI错误提示-->
              <div v-else-if="msg.isError" class="error-message">
                <p>{{ msg.content }}</p>
              </div>
              <!--正常的AI消息-->
              <MarkdownRenderer v-else-if="msg.senderType === 2 && msg.content && !msg.isError" :content="msg.content"
                :is-ai-message="true" />
              <!--用户消息：纯文本，pre-wrap 处理换行，不用 v-html 避免 XSS-->
              <p v-else-if="msg.senderType === 1 && msg.content" style="white-space: pre-wrap; margin: 0;">{{ msg.content }}</p>
            </div>
            <!-- 只展示 score >= 0.5 的引用（score 为 null 表示未打分，也展示） -->
            <div v-if="msg.senderType === 2 && highScoreCitations(msg.citations).length" class="message-citations">
              <div class="citations-title">📚 参考资料</div>
              <div v-for="citation in highScoreCitations(msg.citations)" :key="citation.id"
                class="citation-card" :class="{ 'citation-card--link': citation.articleId }"
                @click="citation.articleId && goToArticle(citation.articleId)">
                <div class="citation-name">
                  {{ citation.documentName || citation.datasetName || '知识库引用' }}
                  <span v-if="citation.articleId" class="citation-link-hint">查看全文 →</span>
                </div>
                <div v-if="citation.content" class="citation-content">
                  {{ formatCitationContent(citation.content) }}
                </div>
              </div>
            </div>
            <div class="message-time">
              {{ msg.senderType === 2 && isAiTyping && !msg.content ? '正在输入中' : msg.createdAt }}
            </div>
          </div>
        </div>
      </div>

      <!-- 复盘弹窗 -->
      <!-- destroy-on-close 防止弹窗关闭时焦点回流触发其他按钮 -->
      <el-dialog v-model="summaryDialogVisible" title="今日对话复盘" width="520px"
        :close-on-click-modal="false" destroy-on-close @closed="onDialogClosed">
        <div class="summary-content">
          <div class="summary-section">
            <div class="summary-label">📋 对话总结</div>
            <div class="summary-text">{{ summaryData.summary }}</div>
          </div>
          <div class="summary-section" v-if="summaryData.suggestions?.length">
            <div class="summary-label">💡 改善建议</div>
            <div v-for="(s, i) in summaryData.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-index">{{ i + 1 }}</span>{{ s }}
            </div>
          </div>
        </div>
        <template #footer>
          <el-button @click="summaryDialogVisible = false">关闭</el-button>
          <el-button type="primary" :loading="saveNoteLoading" @click="saveToCalendar">
            保存到情绪日历
          </el-button>
        </template>
      </el-dialog>

      <!-- 聊天输入区域 -->
      <div class="chat-input">
        <div class="input-container">
          <el-input v-model="userMessage" type="textarea" :rows="3" placeholder="请输入您想要分享的内容..." :maxlength="500"
            @keydown="handleKeydown" resize="none" :disabled="isAiTyping" clearable />
          <!-- resize="none"锁死输入框大小，当 AI 正在用打字机效果回复你时（此时 isAiTyping 变量为 true），这个输入框会被瞬间冻结”（变成灰色，无法输入） -->
          <div class="input-footer">
            <span>按Enter发送，Shift+Enter换行</span>
            <span>{{ userMessage.length }}/500</span>
          </div>
        </div>
        <el-button class="send-btn" type="primary"
          :disabled="!userMessage.trim() || userMessage.length > 500 || isAiTyping || isSending" @click="sendMessage">
          <el-icon size="20">
            <Promotion />
          </el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { ChatRound, Clock, DeleteFilled, Plus, Promotion, Sunny, VideoPause } from '@element-plus/icons-vue'
import { getConversationList, getConversationMessages, deleteConversation, renameConversation, generateConversationSummary, saveAiNote } from '@/api/frontend'
import { fetchEventSource } from '@microsoft/fetch-event-source'

const router = useRouter()
const goToArticle = (articleId) => router.push(`/knowledge/article/${articleId}`)

// ── 基础响应式数据 ────────────────────────────────────────────────────────────
const userMessage = ref('')
const isSending = ref(false)
const isAiTyping = ref(false)
const messagesContainer = ref(null)
const messages = ref([])
const iconUrl = new URL('@/assets/images/robot-fill.png', import.meta.url).href
const likeIconUrl = new URL('@/assets/images/like.png', import.meta.url).href
const usersIconUrl = new URL('@/assets/images/users.png', import.meta.url).href

// ── 会话管理（Dify conversation_id 驱动）────────────────────────────────────
const currentConversationId = ref(null)
const sessionList = ref([])
// 当前正在运行的 AbortController，用于停止生成
const abortController = ref(null)
// SSE 重连计数，网络异常时最多自动重试 2 次
const sseRetryCount = ref(0)
const SSE_MAX_RETRY = 2

// 情绪花园保持静态默认值（情绪分析已移除）
const currentEmotion = ref({
  emotionScore: 50,
  isNegative: false,
  riskLevel: 0,
  suggestion: '继续保持，今天也很棒～',
  improvementSuggestions: [],
  riskDescription: ''
})

// ── 工具函数 ─────────────────────────────────────────────────────────────────
const formatTimestamp = (ts) => {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}


// 去掉 HTML 标签，截取摘要
const formatCitationContent = (content) => {
  if (!content) return ''
  const plain = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain
}

// score 有值时只保留 >= 0.5；score 为 null 说明 Dify 未开启打分，全部展示
const highScoreCitations = (citations = []) =>
  citations.filter(c => c.score == null || c.score >= 0.5)

const getEmotionIntensityClass = (score) => {
  if (score > 61) return 3
  if (score >= 31) return 2
  return 1
}

const getRiskLevelText = (level) => {
  const map = { 0: '正常', 1: '关注', 2: '预警', 3: '危机' }
  return map[level] ?? '未知'
}

// 智能滚动：force=true 时强制滚底（发消息/切换会话时用）
// force=false 时只有用户已在底部附近（120px 内）才跟随滚动，防止打断用户翻阅历史
const isNearBottom = () => {
  if (!messagesContainer.value) return true
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  return scrollHeight - scrollTop - clientHeight < 120
}
const scrollToBottom = (force = false) => {
  nextTick(() => {
    if (messagesContainer.value && (force || isNearBottom())) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ── 会话列表 ─────────────────────────────────────────────────────────────────
const loadConversationList = () => {
  getConversationList().then(res => {
    // res 是 Dify 原始对象 { data: [...], has_more, limit }
    const list = res?.data || []
    sessionList.value = list.map(item => ({
      id: item.id,
      sessionTitle: item.name || '未命名对话',
      startedAt: formatTimestamp(item.created_at),
    }))
  }).catch(() => {})
}

// ── 点击历史会话 ──────────────────────────────────────────────────────────────
const handleSessionClick = (session) => {
  currentConversationId.value = session.id
  messages.value = []

  getConversationMessages(session.id).then(res => {
    // res 是 Dify 原始对象 { data: [...], has_more }
    const difyMsgs = res?.data || []
    // 将 Dify 的 { query, answer } 展开成两条消息
    messages.value = difyMsgs.flatMap(msg => {
      const time = formatTimestamp(msg.created_at)
      const result = []
      if (msg.query) {
        result.push({ id: `u_${msg.id}`, senderType: 1, content: msg.query, createdAt: time })
      }
      if (msg.answer) {
        result.push({ id: msg.id, senderType: 2, content: msg.answer, createdAt: time })
      }
      return result
    })
    scrollToBottom(true)
  })
}

// ── 删除会话 ─────────────────────────────────────────────────────────────────
const handleSessionDelete = (sessionId) => {
  ElMessageBox.confirm('确定要删除该会话吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteConversation(sessionId).then(() => {
      ElMessage.success('删除成功')
      if (currentConversationId.value === sessionId) {
        currentConversationId.value = null
        messages.value = []
      }
      loadConversationList()
    })
  }).catch(() => {})
}

// ── 新建对话 ─────────────────────────────────────────────────────────────────
const createNewSession = () => {
  currentConversationId.value = null
  messages.value = []
}

// ── 停止生成 ──────────────────────────────────────────────────────────────────
const stopGeneration = () => {
  abortController.value?.abort()
  abortController.value = null
  isAiTyping.value = false
  // 标记最后一条 AI 消息为已停止（有内容就保留，没内容就提示）
  const lastAiMsg = messages.value[messages.value.length - 1]
  if (lastAiMsg?.senderType === 2 && !lastAiMsg.content) {
    lastAiMsg.content = '（已停止生成）'
  }
}

// ── AI 流式回复（接入 Dify SSE）──────────────────────────────────────────────
const startAIResponse = (query) => {
  if (isAiTyping.value) {
    ElMessage.warning('AI助手正在输入中，请稍后')
    return
  }
  isAiTyping.value = true

  const aiMessage = {
    id: `ai-${Date.now()}`,
    senderType: 2,
    content: '',
    citations: [],
    createdAt: new Date().toLocaleString('zh-CN'),
  }
  messages.value.push(aiMessage)
  scrollToBottom(true)

  const ctl = new AbortController()
  abortController.value = ctl
  sseRetryCount.value = 0//网络异常的重连计数清零,每次开始新一轮 AI 回复时，重试次数从 0 开始算

  // 记录是否是新会话（用于自动命名）
  const isNewConversation = !currentConversationId.value

  fetchEventSource('/api/dify/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'token': localStorage.getItem('token'),
    },
    body: JSON.stringify({
      query,
      conversation_id: currentConversationId.value || undefined,
    }),
    signal: ctl.signal,
    onmessage(event) {
      const raw = event.data?.trim()
      if (!raw || raw === '[DONE]') return

      let payload
      try {
        payload = JSON.parse(raw)
      } catch {
        return
      }

      const lastAiMsg = messages.value[messages.value.length - 1]

      if (payload.event === 'message') {
        // 首条 message 事件携带 conversation_id
        if (!currentConversationId.value && payload.conversation_id) {
          currentConversationId.value = payload.conversation_id
          loadConversationList()
          // 自动命名：用用户第一条消息前15字作为会话标题
          if (isNewConversation) {
            const title = query.slice(0, 15).trim() || '新对话'
            renameConversation(payload.conversation_id, title).catch(() => {})
          }
        }
        lastAiMsg.content += payload.answer || ''
        scrollToBottom()  // 智能滚动：用户翻阅历史时不强制打断

      } else if (payload.event === 'message_end') {
        lastAiMsg.citations = payload.citations || []
        isAiTyping.value = false
        abortController.value = null
        ctl.abort()
        loadConversationList()

      } else if (payload.event === 'error') {
        handleAiError(payload.message || 'AI 回复失败')
        abortController.value = null
        ctl.abort()
      }
    },
    onerror(err) {
      // 用户主动中断（AbortController.abort()），直接停止
      if (err.name === 'AbortError') throw err
      // 网络异常：未超过重试上限则让 fetchEventSource 自动重连
      sseRetryCount.value++
      if (sseRetryCount.value >= SSE_MAX_RETRY) {
        abortController.value = null
        handleAiError('连接失败，请重试')
        throw err
      }
    },
  })
}

// ── AI 错误处理 ───────────────────────────────────────────────────────────────
const handleAiError = (errMsg) => {
  const lastAiMsg = messages.value[messages.value.length - 1]
  if (lastAiMsg && lastAiMsg.senderType === 2 && !lastAiMsg.content) {
    lastAiMsg.content = 'AI回复失败，请重试'
  }
  isAiTyping.value = false
  ElMessage.error(errMsg)
}

// ── 发送消息 ─────────────────────────────────────────────────────────────────
const sendMessage = async () => {
  if (!userMessage.value.trim()) return
  if (isAiTyping.value || isSending.value) {
    ElMessage.warning('AI助手正在输入中，请稍后')
    return
  }

  const message = userMessage.value.trim()
  userMessage.value = ''
  isSending.value = true

  try {
    // 追加用户消息到界面
    messages.value.push({
      id: Date.now(),
      senderType: 1,
      content: message,
      createdAt: new Date().toLocaleString('zh-CN'),
    })
    scrollToBottom(true)

    // 发起 Dify 流式请求
    startAIResponse(message)
  } finally {
    isSending.value = false
  }
}

// ── 复盘功能 ─────────────────────────────────────────────────────────────────
const summaryDialogVisible = ref(false)
const summaryLoading = ref(false)
const saveNoteLoading = ref(false)
const summaryData = ref({ summary: '', suggestions: [] })
const onDialogClosed = () => {} // 仅用于阻断焦点回流，无逻辑

const openSummaryDialog = async () => {
  if (!currentConversationId.value) return
  summaryLoading.value = true
  try {
    const data = await generateConversationSummary(currentConversationId.value)
    summaryData.value = data
    summaryDialogVisible.value = true
  } catch {
    ElMessage.error('生成复盘失败，请稍后重试')
  } finally {
    summaryLoading.value = false
  }
}

const saveToCalendar = async () => {
  saveNoteLoading.value = true
  try {
    await saveAiNote({
      noteDate: new Date().toISOString().slice(0, 10),
      conversationId: currentConversationId.value,
      summary: summaryData.value.summary,
      suggestions: summaryData.value.suggestions,
    })
    ElMessage.success('已保存到情绪日历')
    summaryDialogVisible.value = false
  } catch {
    ElMessage.error('保存失败，请重试')
  } finally {
    saveNoteLoading.value = false
  }
}

// ── 键盘事件 ─────────────────────────────────────────────────────────────────
const handleKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()//输入框/文本域被包在 <form> 里，或者按下 Enter 会触发浏览器默认行为，比如：默认提交表单（页面刷新或触发 submit）
    //反正就是阻止浏览器默认行为
    sendMessage()
  }
}

// ── 初始化 ────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadConversationList()
})
</script>
<style scoped lang="scss">
.consultation-container {
  margin: 0 auto;
  width: 1200px;
  display: flex;
  gap: 20px;
  padding: 20px;

  .sidebar {
    width: 320px;

    .ai-assistant-info {
      margin-bottom: 20px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 252, 248, 0.95) 100%);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(251, 146, 60, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(251, 146, 60, 0.08);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;

      .breathing-circle {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
        animation: breathing 4s ease-in-out infinite;
        box-shadow: 0 6px 24px rgba(251, 146, 60, 0.25);
        position: relative;
      }

      .assistant-name {
        font-size: 16px;
        font-weight: 700;
        background: linear-gradient(135deg, #fb923c, #f59e0b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        background-clip: text;
        margin: 0 0 12px;
      }

      .online-status {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #059669;
        font-size: 12px;
        font-weight: 600;

        .status-dot {
          width: 8px;
          height: 8px;
          background: #059669;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 2s infinite;
          box-shadow: 0 0 8px rgba(5, 150, 105, 0.4);
        }
      }
    }

    .session-history {
      background: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      min-height: 250px;
      display: flex;
      flex-direction: column;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;

      }

      .session-list {
        overflow-y: auto;
        max-height: 200px;
        scrollbar-width: thin;
        scrollbar-color: rgba(64, 150, 255, 0.3) transparent;

        .session-item {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;

          &:hover {
            background: #f8f9ff;
            border-color: #e6f0ff;
          }

          &.active {
            background: #e6f0ff;
            border-color: #4096ff;
          }

          .session-info {
            flex: 1;

            .session-title {
              font-weight: 500;
              font-size: 14px;
              color: #333;
              margin-bottom: 4px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;

              .session-meta {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 6px;

                .session-time {
                  font-size: 12px;
                  color: #999;
                }
              }

              .session-preview {
                width: 200px;
                font-size: 12px;
                color: #666;
                margin-bottom: 6px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .session-stats {
                display: flex;
                align-items: center;
                gap: 12px;

                span {
                  font-size: 12px;
                  color: #999;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                }
              }
            }

            .session-actions {
              position: absolute;
              top: 10px;
              right: 12px;
            }
          }
        }

        .no-sessions-text {
          text-align: center;
          font-size: 14px;
          color: #999;
        }
      }
    }

    .emotion-garden {
      background: linear-gradient(135deg, #fef9e7 0%, #fcf4e6 50%, #f6f0e8 100%);
      border-radius: 20px;
      padding: 16px;
      margin-bottom: 20px;
      box-shadow: 0 8px 32px rgba(252, 244, 230, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
      min-height: 300px;

      .garden-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        position: relative;
        z-index: 2;

        .garden-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #8b4513;
        }
      }

      .emotion-info {
        margin: 0 auto;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.8);
        background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
        color: #fff;

        .emotion-name {
          font-size: 15px;
          font-weight: 600;
          line-height: 1;
          margin-bottom: 2px;
        }

        .emotion-score {
          font-size: 14px;
          font-weight: 700;
          opacity: 0.9;
        }
      }

      .warm-tips {
        text-align: center;
        margin-bottom: 16px;

        .emotion-status-text {
          margin-bottom: 12px;

          .status-label {
            font-size: 14px;
            color: #8b7355;
            margin-right: 8px;
          }

          .status-emotion {
            font-size: 16px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 16px;
            display: inline-block;
          }
        }

        .emotion-intensity {
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          .intensity-dots {
            display: flex;
            gap: 4px;

            .dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #e0e0e0;
              transition: all 0.3s ease;

              &.active {
                background: linear-gradient(135deg, #ff9a9e, #fecfef);
                transform: scale(1.2);
                box-shadow: 0 2px 8px rgba(255, 154, 158, 0.4);
              }
            }
          }

          .intensity-text {
            font-size: 12px;
            color: #8b7355;
            font-weight: 500;
          }
        }

        .warm-suggestion {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8));
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);

          .suggestion-icon {
            font-size: 20px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .suggestion-content {
            text-align: left;
            flex: 1;

            .suggestion-title {
              font-size: 14px;
              font-weight: 600;
              color: #8b7355;
              margin-bottom: 6px;
            }

            .suggestion-text {
              font-size: 13px;
              color: #6b5b47;
              line-height: 1.5;
            }
          }
        }

        .healing-actions {
          margin-bottom: 16px;

          .actions-title {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #8b7355;
            margin-bottom: 16px;
          }

          .actions-list {
            display: flex;
            flex-direction: column;
            gap: 10px;

            .action-item {
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
              border-radius: 12px;
              padding: 12px;
              display: flex;
              align-items: center;
              gap: 10px;
              border: 1px solid rgba(255, 255, 255, 0.5);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
              text-align: left;

              .action-icon {
                font-size: 14px;
                color: #ffd700;
                flex-shrink: 0;
              }

              .action-text {
                font-size: 12px;
                color: #6b5b47;
                line-height: 1.4;
                flex: 1;
              }
            }
          }
        }

        .risk-notice {
          background: linear-gradient(135deg, #fff9e6, #ffeaa7);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border: 1px solid rgba(255, 234, 167, 0.6);
          box-shadow: 0 6px 20px rgba(255, 234, 167, 0.3);

          .notice-icon {
            font-size: 20px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .notice-content {
            flex: 1;

            .notice-title {
              font-size: 14px;
              font-weight: 600;
              color: #d4840f;
              margin-bottom: 6px;
            }

            .notice-text {
              font-size: 13px;
              color: #b8740c;
              line-height: 1.5;
            }
          }
        }
      }
    }
  }

  .chat-main {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 252, 250, 0.98) 100%);
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(251, 146, 60, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(251, 146, 60, 0.1);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;

    .chat-header {
      background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      flex-shrink: 0;

      .header-left {
        display: flex;
        align-items: center;

        .chat-avatar {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 1;
        }

        .chat-info {
          h2 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 4px;
          }

          p {
            font-size: 14px;
          }
        }
      }
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 252, 248, 0.05) 100%);
      min-height: 0;
      max-height: calc(100vh - 200px);
      scrollbar-width: thin;
      scrollbar-color: rgba(251, 146, 60, 0.3) transparent;

      .message-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          flex-shrink: 0;
        }

        &.ai-message {
          .message-avatar {
            background: linear-gradient(135deg, #fb923c, #f59e0b);
            box-shadow: 0 4px 12px rgba(251, 146, 60, 0.3);
          }
        }

        &.user-message {
          .message-avatar {
            background: linear-gradient(135deg, #6b7280, #4b5563);
            box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
          }
        }

        .message-content {
          max-width: 70%;

          .message-bubble {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 252, 248, 0.95) 100%);
            border-radius: 16px;
            padding: 12px 16px;
            position: relative;
            animation: fadeInUp 0.4s ease-out;
            border: 1px solid rgba(251, 146, 60, 0.1);
            box-shadow: 0 4px 16px rgba(251, 146, 60, 0.05);

            .typing-indicator {
              display: flex;
              gap: 4px;
              padding: 8px 0;

              .typing-dot {
                width: 8px;
                height: 8px;
                background: #ccc;
                border-radius: 50%;
                animation: typing 1.5s ease-in-out infinite;

                &:nth-child(2) {
                  animation-delay: 0.2s;
                }

                &:nth-child(3) {
                  animation-delay: 0.4s;
                }
              }
            }

            /* 错误消息样式 */
            .error-message {
              background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
              border: 1px solid #F87171;
              border-radius: 12px;
              padding: 12px 16px;
              color: #991B1B;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 8px;
            }
          }

          .message-time {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
          }

        .message-citations {
          margin-top: 10px;
        }

        .citations-title {
          margin-bottom: 8px;
          font-size: 12px;
          color: #a16207;
          font-weight: 600;
        }

        .citation-card {
          margin-bottom: 8px;
          padding: 10px 12px;
          background: #fffaf0;
          border: 1px solid rgba(251, 146, 60, 0.18);
          border-radius: 10px;
        }

        .citation-card--link {
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          &:hover {
            background: #fff3e0;
            border-color: rgba(251, 146, 60, 0.4);
          }
        }

        .citation-name {
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #9a3412;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .citation-link-hint {
          font-size: 11px;
          font-weight: 500;
          color: #fb923c;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .citation-content {
          font-size: 12px;
          line-height: 1.6;
          color: #78716c;
          white-space: pre-wrap;
        }
        }
      }
    }

    .chat-input {
      border-top: 1px solid rgba(251, 146, 60, 0.1);
      padding: 20px 24px;
      display: flex;
      gap: 12px;
      align-items: flex-end;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 252, 248, 0.7) 100%);
      backdrop-filter: blur(10px);
      flex-shrink: 0;

      .input-container {
        flex: 1;
      }

      .input-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #78716c;
        font-weight: 500;
      }

      .send-btn {
        height: 60px;
        width: 60px;
        border-radius: 16px;
        background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%) !important;
        border: none !important;
        box-shadow: 0 6px 20px rgba(251, 146, 60, 0.25);
        transition: all 0.3s ease;
      }

    }

  }
}

// 复盘弹窗样式（scoped 外层选择器穿透到 el-dialog）
:deep(.el-dialog__body) {
  padding: 16px 24px;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 18px;

  .summary-section {
    .summary-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }

    .summary-text {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.8;
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px 16px;
      white-space: pre-wrap;
    }

    .suggestion-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      color: #4b5563;
      line-height: 1.7;
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;

      &:last-child { border-bottom: none; }

      .suggestion-index {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: linear-gradient(135deg, #fb923c, #f59e0b);
        color: white;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }
    }
  }
}
</style>
