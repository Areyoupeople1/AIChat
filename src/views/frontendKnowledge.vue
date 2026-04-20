<template>
  <div class="knowledge-container">
    <!-- 头部区域 -->
    <div class="header-section">
      <div class="header-content">
        <el-icon size="32">
          <Notebook />
        </el-icon>
        <h1>心理健康知识库</h1>
      </div>
    </div>
    <!-- 内容区域 -->
    <div class="content">
      <!-- 左侧推荐阅读 -->
      <div class="recommend-section">
        <div class="section-title">
          推荐阅读
        </div>
        <div class="recommend-list">
          <div class="recommend-item" v-for="item in recommendList" :key="item.id" @click="gotoArticle(item.id)">
            <h4>{{ item.title }}</h4>
            <p class="read-count">
              <el-icon>
                <Histogram />
              </el-icon>
              阅读量：{{ item.read_count }}
            </p>
          </div>
        </div>
      </div>
      <!-- 右侧文章列表 -->
      <div class="article-list">
        <div class="article-item" v-for="item in articleList" :key="item.id" @click="gotoArticle(item.id)">
          <el-image :src="getCoverImage(item.cover)" style="width: 240px; height: 150px; border-radius: 8px;" />
          <div class="info">
            <div class="title">
              <h3>{{ item.title }}</h3>
              <el-tag size="small" type="primary" plain>{{ item.category_name || '未分类' }}</el-tag>
            </div>
            <div :style="{ marginTop: '10px' }">
              <div class="flex-box">
                <el-icon>
                  <Avatar />
                </el-icon>
                <span>{{ item.author_name }}</span>
              </div>
              <div class="flex-box">
                <el-icon>
                  <List />
                </el-icon>
                <span>{{ dayjs(item.updateAt).format('YYYY-MM-DD') }}</span>
              </div>
            </div>
            <div :style="{ marginTop: '10px' }">
              <div class="flex-box">
                <el-icon>
                  <Platform />
                </el-icon>
                <span>观看人数:{{ item.read_count || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
    <!-- //分页 -->
    <div class="pagination-wrapper">
      <el-pagination style="margin-top: 25px;" :page-size="pagination.size" :total="pagination.total"
        layout="prev, pager, next" @change="hanleChange" />
    </div>
  </div>
</template>
<script setup>
import { getKnowledgeList } from '@/api/frontend'
import { Avatar, Histogram } from '@element-plus/icons-vue'
import { ref, onMounted, reactive } from 'vue'
import { dayjs } from 'element-plus'
import { useRouter } from 'vue-router'
// 图片基础URL配置
const IMAGE_BASE_URL = 'http://localhost:3000'
// 默认图片路径
const defaultImage = 'https://file.itndedu.com/psychology_ai.png'
const recommendList = ref([])
const router = useRouter()
const pagination = reactive({
  currentPage: 1,
  size: 5,
  total: 0
})
const getCoverImage = (url) => {
  return url ? IMAGE_BASE_URL + url : defaultImage
}
const articleList = ref([])
const getPageList = () => {
  const params = {
    sortField: 'publishedAt',
    sortDirection: 'desc',
    ...pagination
  }
  getKnowledgeList(params).then(res => {
    // console.log(res, 'getKnowledgeList')
    articleList.value = res.records
    pagination.total = res.total
  })
}
const hanleChange = (page) => {
  pagination.currentPage = page
  getPageList()
}
//跳转到详情页面
const gotoArticle = (id) => {
  router.push({
    path: `/knowledge/article/${id}`
  })
}
onMounted(() => {
  const params = {
    sortField: 'readCount',
    sortDirection: 'desc',
    currentPage: 1,
    size: 5
  }
  getPageList()
  getKnowledgeList(params).then(res => {
    console.log(res, 'getKnowledgeList')
    recommendList.value = res.records
  })
})
</script>
<style lang="scss" scoped>
.knowledge-container {
  background: linear-gradient(135deg, #fafbfc 0%, #f7f9fc 50%, #f2f6fa 100%);

  .flex-box {
    display: flex;
    align-items: center;

    span {
      margin-left: 10px;
    }
  }

  .header-section {
    background: linear-gradient(135deg, #f59e0b 0%, #8b5cf6 100%);
    color: white;
    padding: 48px;

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .content {
    display: flex;
    gap: 20px;
    margin: 0 auto;
    width: 1200px;
    padding: 20px;

    .recommend-section {
      width: 280px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
      padding: 15px;
      height: 400px;

      .section-title {
        font-size: 12;
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .recommend-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .recommend-item {
          border-left: 4px solid #f59e0b;
          padding-left: 10px;
          cursor: pointer;

          .read-count {
            margin-top: 15px;
            font-size: 12px;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 10px;
          }
        }
      }
    }

    .article-list {
      flex: 1;

      .article-item {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        padding: 15px;
        margin-bottom: 20px;
        display: flex;

        .info {
          margin-left: 20px;

          .title {
            display: flex;
            align-items: center;
            gap: 10px;
          }
        }
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding-bottom: 30px;
  }
}
</style>