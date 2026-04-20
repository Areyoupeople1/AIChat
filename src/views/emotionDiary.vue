<template>
  <div class="emotionDiary-container">
    <!-- 头部 -->
    <div class="header-section">
      <div class="header-content">
        <el-image style="height: 30px;width: 30px" :src="iconUrl"/>
        <h1>情绪日记</h1>
      </div>
    </div>

    <div class="content">
      <!-- ── 日历卡片 ─────────────────────────────────── -->
      <div class="diary-card">
        <!-- 月份导航 -->
        <div class="calendar-nav">
          <el-button circle @click="prevMonth"><el-icon><ArrowLeft /></el-icon></el-button>
          <span class="calendar-title">{{ currentYear }} 年 {{ currentMonth }} 月</span>
          <el-button circle @click="nextMonth"><el-icon><ArrowRight /></el-icon></el-button>
        </div>

        <!-- 周标题 -->
        <div class="calendar-weekdays">
          <span v-for="d in ['一','二','三','四','五','六','日']" :key="d">周{{ d }}</span>
        </div>

        <!-- 日期格子 -->
        <div class="calendar-grid">
          <!-- 月首空白占位 -->
          <div v-for="n in startOffset" :key="`pad-${n}`" class="calendar-cell empty"></div>
          <!-- 每一天 -->
          <div
            v-for="day in calendarDays" :key="day.date"
            class="calendar-cell"
            :class="{
              'is-today': day.date === today,
              'is-selected': day.date === selectedDate,
              'has-record': !!day.record,
              'is-future': day.date > today,
            }"
            @click="selectDay(day)"
          >
            <span class="day-num">{{ day.dayNum }}</span>
            <template v-if="day.record">
              <div class="mood-dot" :style="{ background: getMoodColor(day.record.mood_score) }"></div>
              <span class="mood-emoji">{{ emotionEmoji[day.record.dominant_emotion] || '📝' }}</span>
            </template>
            <!-- AI 复盘标记 -->
            <span v-if="aiNoteMap[day.date]" class="ai-badge">AI</span>
          </div>
        </div>

        <!-- 图例 -->
        <div class="legend">
          <span class="legend-item"><span class="dot" style="background:#22c55e"></span>心情好 (7-10)</span>
          <span class="legend-item"><span class="dot" style="background:#f59e0b"></span>一般 (4-6)</span>
          <span class="legend-item"><span class="dot" style="background:#ef4444"></span>不太好 (1-3)</span>
        </div>
      </div>

      <!-- ── AI 复盘笔记（独立显示，不影响情绪记录区域）── -->
      <div v-if="selectedAiNote" class="diary-card ai-note-card">
        <div class="detail-header">
          <div class="detail-date">🤖 AI 复盘 · {{ selectedDate }}</div>
        </div>
        <div class="detail-body">
          <div class="detail-row">
            <span class="detail-label">对话总结</span>
            <div class="detail-value diary-text">{{ selectedAiNote.summary }}</div>
          </div>
          <div v-if="selectedAiNote.suggestions?.length" class="detail-row">
            <span class="detail-label">改善建议</span>
            <div class="detail-value">
              <div v-for="(s, i) in selectedAiNote.suggestions" :key="i" class="ai-suggestion-item">
                <span class="suggestion-num">{{ i + 1 }}</span>{{ s }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 已选日期的情绪记录详情 ──────────────────── -->
      <div v-if="selectedRecord" class="diary-card detail-card">
        <div class="detail-header">
          <div class="detail-date">{{ selectedDate }} 的情绪记录</div>
          <el-button type="danger" text @click="deleteRecord(selectedRecord.id)">
            <el-icon><Delete /></el-icon> 删除记录
          </el-button>
        </div>

        <div class="detail-body">
          <!-- 情绪评分 -->
          <div class="detail-row">
            <span class="detail-label">情绪评分</span>
            <div class="detail-value">
              <el-rate :model-value="selectedRecord.mood_score" disabled :max="10" />
              <span class="score-text">{{ selectedRecord.mood_score }} 分 — {{ emotionStatus[selectedRecord.mood_score - 1] }}</span>
            </div>
          </div>
          <!-- 主要情绪 -->
          <div class="detail-row">
            <span class="detail-label">主要情绪</span>
            <div class="detail-value emotion-tag">
              <span class="emotion-emoji-lg">{{ emotionEmoji[selectedRecord.dominant_emotion] || '📝' }}</span>
              {{ selectedRecord.dominant_emotion }}
            </div>
          </div>
          <!-- 情绪触发 -->
          <div v-if="selectedRecord.emotion_triggers" class="detail-row">
            <span class="detail-label">情绪触发</span>
            <div class="detail-value diary-text">{{ selectedRecord.emotion_triggers }}</div>
          </div>
          <!-- 今日感想 -->
          <div v-if="selectedRecord.diary_content" class="detail-row">
            <span class="detail-label">今日感想</span>
            <div class="detail-value diary-text">{{ selectedRecord.diary_content }}</div>
          </div>
          <!-- 生活指标 -->
          <div class="detail-row">
            <span class="detail-label">生活状态</span>
            <div class="detail-value indicators">
              <span class="indicator-badge">😴 睡眠：{{ sleepLabels[selectedRecord.sleep_quality] || '未填' }}</span>
              <span class="indicator-badge">💪 压力：{{ stressLabels[selectedRecord.stress_level] || '未填' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 填写记录表单（选中日期无情绪记录时显示）──────── -->
      <template v-if="!selectedRecord">
        <!--情绪评分-->
        <div class="diary-card">
          <div class="title">
            {{ selectedDate === today ? '今日情绪评分' : `${selectedDate} 情绪评分` }}
            <span class="date-badge">{{ selectedDate }}</span>
          </div>
          <div class="section">
            <p>您当天的整体情绪状态如何？（1-10分）</p>
            <div class="rate">
              <el-rate v-model="dairyForm.moodScore" :texts="emotionStatus" show-text :max="10" size="large"></el-rate>
            </div>
          </div>
        </div>

        <!--主要情绪-->
        <div class="diary-card">
          <div class="title">主要情绪</div>
          <div class="emotion-grid">
            <div class="emotion-card" v-for="emotion in emotionOptions" :key="emotion.name"
                 @click="selectEmotion(emotion.name)"
                 :class="{'selected': emotion.name === dairyForm.dominantEmotion}">
              <el-image :src="emotion.url" style="width: 50px;height: 50px"></el-image>
              <div class="emotion-name">{{ emotion.name }}</div>
            </div>
          </div>
        </div>

        <!--详细记录-->
        <div class="diary-card">
          <div class="title">详细记录</div>
          <div class="detail-form">
            <div class="form-label">情绪触发因素</div>
            <el-input v-model="dairyForm.emotionTriggers" type="textarea" :rows="3"
                placeholder="当天什么事情影响了您的情绪？" maxlength="1000" show-word-limit />
            <div class="form-label">今日感想</div>
            <el-input v-model="dairyForm.diaryContent" type="textarea" :rows="5"
                placeholder="写下您当天的想法、感受或发生的有趣事情..." maxlength="1000" show-word-limit />
            <div class="life-indicators">
              <div class="indicator-group">
                <div class="form-label">睡眠质量</div>
                <el-select v-model="dairyForm.sleepQuality" placeholder="请选择">
                  <el-option label="很差" :value="1"/><el-option label="较差" :value="2"/>
                  <el-option label="一般" :value="3"/><el-option label="良好" :value="4"/>
                  <el-option label="优秀" :value="5"/>
                </el-select>
              </div>
              <div class="indicator-group">
                <div class="form-label">压力水平</div>
                <el-select v-model="dairyForm.stressLevel" placeholder="请选择">
                  <el-option label="很低" :value="1"/><el-option label="较低" :value="2"/>
                  <el-option label="一般" :value="3"/><el-option label="较高" :value="4"/>
                  <el-option label="很高" :value="5"/>
                </el-select>
              </div>
            </div>
            <div class="action-buttons">
              <el-button @click="resetForm">重置</el-button>
              <el-button type="primary" @click="submitForm" :loading="loading">提交记录</el-button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { dayjs, ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, Delete } from '@element-plus/icons-vue'
import { addMoodRecord, getMoodRecords, deleteMoodRecord, getAiNotes } from '@/api/frontend'

const iconUrl = new URL('@/assets/images/like.png', import.meta.url).href

// ── 静态配置 ──────────────────────────────────────────────────────────────────
const emotionStatus = ['绝望崩溃','消沉抑郁','焦虑烦躁','低落不悦','平静淡然','轻松惬意','愉悦舒心','欢欣满足','兴奋欣喜','极致幸福']
const emotionEmoji  = { '开心':'😊','平静':'😌','焦虑':'😰','悲伤':'😢','兴奋':'🤩','疲惫':'😩','惊讶':'😲','困惑':'🤔' }
const sleepLabels   = { 1:'很差', 2:'较差', 3:'一般', 4:'良好', 5:'优秀' }
const stressLabels  = { 1:'很低', 2:'较低', 3:'一般', 4:'较高', 5:'很高' }
const emotionOptions = [
  { name:'开心', url: new URL('@/assets/images/开心.png', import.meta.url).href },
  { name:'平静', url: new URL('@/assets/images/平静.png', import.meta.url).href },
  { name:'焦虑', url: new URL('@/assets/images/焦虑.png', import.meta.url).href },
  { name:'悲伤', url: new URL('@/assets/images/悲伤.png', import.meta.url).href },
  { name:'兴奋', url: new URL('@/assets/images/兴奋.png', import.meta.url).href },
  { name:'疲惫', url: new URL('@/assets/images/疲惫.png', import.meta.url).href },
  { name:'惊讶', url: new URL('@/assets/images/惊讶.png', import.meta.url).href },
  { name:'困惑', url: new URL('@/assets/images/困惑.png', import.meta.url).href },
]

// ── 状态 ──────────────────────────────────────────────────────────────────────
const today        = dayjs().format('YYYY-MM-DD')
const currentYear  = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)   // 1~12
const selectedDate = ref(today)
const monthRecords = ref([])
const aiNotes      = ref([])   // 当月 AI 复盘笔记
const loading      = ref(false)

// ── 日历计算 ──────────────────────────────────────────────────────────────────
// 当月情绪记录 map: { 'YYYY-MM-DD': record }
const recordMap = computed(() => {
  const map = {}
  monthRecords.value.forEach(r => { map[r.diary_date] = r })
  return map
})

// 当月 AI 复盘笔记 map: { 'YYYY-MM-DD': note }
const aiNoteMap = computed(() => {
  const map = {}
  aiNotes.value.forEach(n => { map[n.note_date] = n })
  return map
})

// 当前选中日期的 AI 复盘笔记
const selectedAiNote = computed(() => aiNoteMap.value[selectedDate.value] || null)

// 当月第一天是周几（0=Sun）→ 转为周一起始偏移
const startOffset = computed(() => {
  const first = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2,'0')}-01`)
  return (first.day() + 6) % 7   // 0=Mon, …, 6=Sun
})

// 当月所有天，附带当天的记录
const calendarDays = computed(() => {
  const daysInMonth = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2,'0')}-01`).daysInMonth()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const date = `${currentYear.value}-${String(currentMonth.value).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return { date, dayNum: d, record: recordMap.value[date] || null }
  })
})

// 当前选中日期的记录（有则展示详情，无则展示表单）
const selectedRecord = computed(() => recordMap.value[selectedDate.value] || null)

// ── 月份切换 ──────────────────────────────────────────────────────────────────
const prevMonth = () => {
  if (currentMonth.value === 1) { currentYear.value--; currentMonth.value = 12 }
  else currentMonth.value--
}
const nextMonth = () => {
  if (currentMonth.value === 12) { currentYear.value++; currentMonth.value = 1 }
  else currentMonth.value++
}

// 月份变化时重新加载记录
watch([currentYear, currentMonth], loadMonthRecords, { immediate: true })
//immediate: true 的意思是：监听一建立，就先执行一次回调
// ── 日期操作 ──────────────────────────────────────────────────────────────────
function loadMonthRecords() {
  const params = { year: currentYear.value, month: currentMonth.value }
  getMoodRecords(params)
    .then(data => { monthRecords.value = Array.isArray(data) ? data : [] })
    .catch(() => {})
  getAiNotes(params)
    .then(data => { aiNotes.value = Array.isArray(data) ? data : [] })
    .catch(() => {})
}

function selectDay(day) {
  selectedDate.value = day.date
  // 切换选中日期时同步表单里的 diaryDate
  dairyForm.diaryDate = day.date
}

// ── 颜色映射 ──────────────────────────────────────────────────────────────────
function getMoodColor(score) {
  if (score >= 7) return '#22c55e'
  if (score >= 4) return '#f59e0b'
  return '#ef4444'
}

// ── 表单 ──────────────────────────────────────────────────────────────────────
const dairyForm = reactive({
  diaryDate:        today,
  moodScore:        0,
  dominantEmotion:  '',
  emotionTriggers:  '',
  diaryContent:     '',
  sleepQuality:     0,
  stressLevel:      0,
})

const selectEmotion = (name) => { dairyForm.dominantEmotion = name }

const resetForm = () => {
  Object.assign(dairyForm, {
    diaryDate: selectedDate.value,
    moodScore: 0, dominantEmotion: '',
    emotionTriggers: '', diaryContent: '',
    sleepQuality: 0, stressLevel: 0,
  })
}

const submitForm = () => {
  if (!dairyForm.moodScore)       return ElMessage.warning('请选择情绪评分')
  if (!dairyForm.dominantEmotion) return ElMessage.warning('请选择主要情绪')

  loading.value = true
  addMoodRecord(dairyForm)
    .then(record => {
      ElMessage.success('情绪记录提交成功')
      // 直接插入到当月记录，日历即时更新
      monthRecords.value.push(record)
      resetForm()
    })
    .finally(() => { loading.value = false })
}

// ── 删除记录 ──────────────────────────────────────────────────────────────────
const deleteRecord = (id) => {
  ElMessageBox.confirm('确定删除这条记录吗？', '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    deleteMoodRecord(id).then(() => {
      ElMessage.success('删除成功')
      monthRecords.value = monthRecords.value.filter(r => r.id !== id)
    })
  }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.emotionDiary-container {
  background: linear-gradient(135deg, #fafbfc 0%, #f7f9fc 50%, #f2f6fa 100%);
  min-height: 100vh;

  .header-section {
    background: linear-gradient(135deg, #7ED321 0%, #F5A623 100%);
    color: white;
    padding: 48px;
    .header-content { display: flex; align-items: center; gap: 12px; }
  }

  .content {
    margin: 0 auto;
    width: 980px;
    padding: 20px;

    .diary-card {
      margin-bottom: 20px;
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);

      .title {
        margin-bottom: 20px;
        font-size: 22px;
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 10px;

        .date-badge {
          font-size: 13px;
          font-weight: 400;
          background: #f0fdf4;
          color: #15803d;
          padding: 2px 10px;
          border-radius: 99px;
          border: 1px solid #bbf7d0;
        }
      }
    }

    // ── 日历 ──────────────────────────────────────────
    .calendar-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 16px;

      .calendar-title {
        font-size: 18px;
        font-weight: 600;
        color: #374151;
        min-width: 160px;
        text-align: center;
      }
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f3f4f6;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .calendar-cell {
      min-height: 70px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 8px 4px 6px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;

      &.empty { cursor: default; }

      &:not(.empty):hover {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      &.is-today {
        background: #f0fdf4;
        border-color: #22c55e;
        .day-num { color: #15803d; font-weight: 700; }
      }

      &.is-selected {
        background: #ecfdf5;
        border-color: #4ade80;
        box-shadow: 0 0 0 2px rgba(34,197,94,0.15);
      }

      &.is-future { opacity: 0.4; }

      .day-num {
        font-size: 14px;
        color: #374151;
        font-weight: 500;
        line-height: 1;
        margin-bottom: 4px;
      }

      .mood-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-bottom: 2px;
      }

      .mood-emoji { font-size: 18px; line-height: 1; }

      .ai-badge {
        font-size: 9px;
        font-weight: 700;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        padding: 1px 4px;
        border-radius: 4px;
        line-height: 1.4;
        margin-top: 1px;
      }
    }

    .legend {
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #6b7280;

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      }
    }

    // ── 记录详情 ──────────────────────────────────────
    .detail-card {
      .detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;

        .detail-date {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }
      }

      .detail-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .detail-row {
        display: flex;
        gap: 16px;

        .detail-label {
          width: 80px;
          flex-shrink: 0;
          font-size: 13px;
          color: #9ca3af;
          font-weight: 500;
          padding-top: 2px;
        }

        .detail-value {
          flex: 1;
          font-size: 14px;
          color: #374151;

          &.diary-text {
            line-height: 1.7;
            white-space: pre-wrap;
            background: #f9fafb;
            padding: 10px 14px;
            border-radius: 8px;
          }

          &.emotion-tag {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 16px;
            .emotion-emoji-lg { font-size: 24px; }
          }

          .score-text {
            margin-left: 10px;
            font-size: 13px;
            color: #6b7280;
          }

          &.indicators {
            display: flex;
            gap: 12px;

            .indicator-badge {
              background: #f3f4f6;
              padding: 4px 12px;
              border-radius: 99px;
              font-size: 13px;
              color: #374151;
            }
          }
        }
      }
    }

    // ── AI 复盘卡片 ───────────────────────────────────
    .ai-note-card {
      border: 1px solid #e0e7ff;
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);

      .ai-suggestion-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 6px 0;
        font-size: 14px;
        color: #4b5563;
        line-height: 1.7;
        border-bottom: 1px solid #e0e7ff;
        &:last-child { border-bottom: none; }

        .suggestion-num {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 3px;
        }
      }
    }

    // ── 表单（复用原有样式）───────────────────────────
    .section {
      margin-bottom: 20px;
      p { font-size: 15px; color: #6B7280; margin-bottom: 15px; }
    }
    .rate { display: flex; align-items: center; }

    .emotion-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      .emotion-card {
        padding: 15px;
        border: 2px solid #E5E7EB;
        border-radius: 15px;
        text-align: center;
        cursor: pointer;
        background: #F9FAFB;
        .emotion-name { margin-top: 10px; padding: 0 75px; color: #374151; }
        &.selected { border-color: #7ED321; background: #F0FDF4; transform: translateY(-3px); }
      }
    }

    .detail-form {
      .form-label { margin: 10px 0; color: #374151; }
      .life-indicators {
        display: flex;
        gap: 20px;
        .indicator-group { flex: 1; }
      }
      .action-buttons { margin-top: 40px; }
    }
  }
}
</style>
