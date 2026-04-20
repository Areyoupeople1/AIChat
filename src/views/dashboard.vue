<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar users">
              <el-image style="width: 40px; height: 40px;" :src="iconUrl1"></el-image>
            </div>
            <div class="info">
              <p class="title">用户总数</p>
              <p class="number">{{ aiData.systemOverview.totalUsers }}</p>
              <p class="subtitle-title">今日新增:{{ aiData.systemOverview.todayNewUsers ?? 0 }}</p>
            </div>
            <div class="info"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar like">
              <el-image style="width: 40px; height: 40px;" :src="iconUrl2"></el-image>
            </div>
            <div class="info">
              <p class="title">情绪日志</p>
              <p class="number">{{ aiData.systemOverview.totalDiaries }}</p>
              <p class="subtitle-title">今日新增:{{ aiData.systemOverview.todayNewDiaries }}</p>
            </div>
            <div class="info"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar comments">
              <el-image style="width: 40px; height: 40px;" :src="iconUrl3"></el-image>
            </div>
            <div class="info">
              <p class="title">知识文章</p>
              <p class="number">{{ aiData.systemOverview.totalArticles ?? 0 }}</p>
              <p class="subtitle-title">已发布文章数</p>
            </div>
            <div class="info"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar smile">
              <el-image style="width: 40px; height: 40px;" :src="iconUrl4"></el-image>
            </div>
            <div class="info">
              <p class="title">平均情绪</p>
              <p class="number">{{ aiData.systemOverview.avgMoodScore }}/10</p>
              <p class="subtitle-title">情绪健康指数</p>
            </div>
            <div class="info"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card style="width:100%">
          <template #header>
            <div class="header-content">
              <p class="title">情绪需求分析</p>
            </div>
          </template>
          <div class="chart-content">
            <div ref="emotionChartRef" style="width:100%;height: 300px;"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card style="width:100%">
          <template #header>
            <div class="header-content">
              <p class="title">情绪类型分布</p>
            </div>
          </template>
          <div class="chart-content">
            <div ref="emotionPieChartRef" style="width:100%;height: 300px;"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px;">
      <el-card style="width:100%">
        <template #header>
          <div class="header-content">
            <p class="title">知识库文章分类分布</p>
          </div>
        </template>
        <div class="chart-content">
          <div ref="articleChartRef" style="width:100%;height: 300px;"></div>
        </div>
      </el-card>
    </el-row>
  </div>
</template>
<script setup>
import { getAnalyticsOverview, getMoodStats } from '@/api/admin'
import { onMounted, ref, onUnmounted } from 'vue'
const iconUrl1 = new URL('@/assets/images/users.png', import.meta.url).href
const iconUrl2 = new URL('@/assets/images/like.png', import.meta.url).href
const iconUrl3 = new URL('@/assets/images/comments.png', import.meta.url).href
const iconUrl4 = new URL('@/assets/images/smile.png', import.meta.url).href
import * as echarts from 'echarts'

const aiData = ref({})
//情绪趋势
let emotionChart = null
const emotionChartRef = ref(null)
let resizeTimer = null
//防抖处理resize事件
const handleResize = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    emotionChart?.resize()
    emotionPieChart?.resize()
    articleChart?.resize()
  }, 300)
}

//初始化图标
const initCharts = () => {
  initEmotionChart()
  initEmotionPieChart()
  initArticleChart()
}
const initEmotionChart = () => {
  if (!emotionChartRef.value) return
  //销毁现有图标
  if (emotionChart) {
    emotionChart.dispose()
  }
  //创建echarts实例
  emotionChart = echarts.init(emotionChartRef.value)
  //获取情绪趋势的数据
  const TrendData = aiData.value.emotionTrend || []
  //配置
  const option = {
    title: {
      text: '情绪趋势分析',
      textStyle: {
        color: '#2d3436',
        fontSize: 16,
        fontWeight: 600,
      },
      left: 'center',
      top: 10
    },
    //提示框
    tooltip: {
      trigger: 'axis',//当用户的鼠标悬停在图表上时，会出现一条垂直的参考线（axis）
      borderWidth: 1,
      borderColor: '#fab1a0',
      textStyle: {
        color: '#2d3436',
      },
    },
    legend: {//图例
      data: ['平均情绪评分', '记录数量'],
      top: 40
    },
    grid: {
      left: '3%',
      right: '4%',
      top: 80,
      bottom: '3%'
    },
    xAxis: {
      type: 'category',
      data: TrendData.map(item => item.date),
      axisLabel: {
        lineStyle: {
          color: '#2d3436',
        }
      }
    },
    yAxis: [{
      type: 'value',
      name: '情绪评分',
      position: 'left',
      axisLabel: {
        lineStyle: {
          color: '#2d3436',
        }
      }
    }, {
      type: 'value',
      name: '记录数量',
      position: 'right',
      axisLabel: {
        lineStyle: {
          color: '#2d3436',
        }
      }
    }],
    series: [{
      name: '平均情绪评分',
      type: 'line',
      data: TrendData.map(item => item.avgMoodScore),
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#faebaf',
      },
      itemStyle: {
        color: '#faebaf',
      },
    },
    {
      name: '记录数量',
      type: 'line',
      data: TrendData.map(item => item.recordCount),
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#eeb5a3',
      },
      itemStyle: {
        color: '#eeb5a3',
      },
    }]
  }
  //调用实例
  emotionChart.setOption(option)
}
// 情绪类型分布饼图
let emotionPieChart = null
const emotionPieChartRef = ref(null)
const initEmotionPieChart = () => {
  if (!emotionPieChartRef.value) return
  if (emotionPieChart) emotionPieChart.dispose()
  emotionPieChart = echarts.init(emotionPieChartRef.value)
  const pieData = (aiData.value.emotionDistribution || []).map(item => ({
    name: item.emotion || '未知',
    value: item.count
  }))
  emotionPieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
    legend: { orient: 'vertical', left: 'left', top: 'middle' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['60%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: pieData.length ? pieData : [{ name: '暂无数据', value: 1, itemStyle: { color: '#eee' } }]
    }]
  })
}

// 文章分类分布柱状图
let articleChart = null
const articleChartRef = ref(null)
const initArticleChart = () => {
  if (!articleChartRef.value) return
  if (articleChart) articleChart.dispose()
  articleChart = echarts.init(articleChartRef.value)
  const catData = aiData.value.articleByCategory || []
  articleChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: catData.map(item => item.category),
      axisLabel: { color: '#636e72' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#636e72' },
      splitLine: { lineStyle: { color: 'rgba(244,162,97,0.1)' } }
    },
    series: [{
      type: 'bar',
      data: catData.map(item => item.count),
      barWidth: '50%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#fb923c' },
            { offset: 1, color: '#fbbf24' }
          ]
        }
      }
    }]
  })
}
onMounted(() => {
  // 并行请求两个接口，拼装 aiData 结构
  Promise.all([getAnalyticsOverview(), getMoodStats()]).then(([stats, moodStats]) => {
    // stats: { totalUsers, todayNewUsers, totalMoodRecords, todayNewMoodRecords, avgMoodScore }
    // moodStats: { emotionDistribution: [{emotion, count}], moodTrend: [{date, avgScore, count}] }
    aiData.value = {
      systemOverview: {
        totalUsers:      stats?.totalUsers          ?? 0,
        todayNewUsers:   stats?.todayNewUsers        ?? 0,
        totalDiaries:    stats?.totalMoodRecords    ?? 0,
        todayNewDiaries: stats?.todayNewMoodRecords ?? 0,
        avgMoodScore:    stats?.avgMoodScore         ?? 0,
        totalArticles:   stats?.totalArticles        ?? 0,
      },
      emotionTrend:        moodStats?.moodTrend          || [],
      emotionDistribution: moodStats?.emotionDistribution || [],
      articleByCategory:   moodStats?.articleByCategory  || [],
    }
    initCharts()
  }).catch(() => {})
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  //移除resize监听，防止内存泄漏
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimer)
  if (emotionChart) { emotionChart.dispose(); emotionChart = null }
  if (emotionPieChart) { emotionPieChart.dispose(); emotionPieChart = null }
  if (articleChart) { articleChart.dispose(); articleChart = null }
})
</script>
<style scoped lang="scss">
.dashboard-container {
  .card-content {
    display: flex;
    align-items: center;

    .avatar {
      margin-right: 12px;
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.users {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.like {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      &.comments {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      &.smile {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }
    }

    .info {
      .title {
        font-size: 14px;
        color: #7f8c8d;
        margin-bottom: 4px;
      }

      .value {
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px
      }

      .subtitle-title {
        font-size: 12px;
        color: #95a5a6;
      }
    }
  }

  .chart-content {
    padding: 20px;
    height: 300px;
    position: relative;

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .consultation-stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;

      .stat-item {
        text-align: center;

        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }
  }
}
</style>
