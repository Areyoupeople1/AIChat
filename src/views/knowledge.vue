<template>
  <div>
    <PageHead title="知识文章">
      <template #buttons>
        <el-button type="primary" @click="handleEdit({})">新增</el-button>
      </template>
    </PageHead>
    <TableSearch :formItem="formItem" @search="handleSearch"></TableSearch>
    <el-table :data="tableData" styles="width: 100%;margin-top: 25px">
      <el-table-column label="文章标题" fixed="left">
        <template #default="scope">
          <div style="display: flex;align-items: center;">
            <el-icon>
              <timer />
            </el-icon>
            <span>{{ scope.row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类">
        <template #default="scope">
          <div style="display: flex;align-items: center;">
            <el-icon>
              <timer />
            </el-icon>
            <span>{{ categoryMap[scope.row.categoryId] }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="作者" prop="authorName" width="150px" />
      <el-table-column label="阅读量" prop="readCount" width="150px" />
      <el-table-column label="发布时间" prop="updatedAt" width="150px" />
      <el-table-column label="操作" width="200px" fixed="right">
        <template #default="scope">
          <div style="display: flex;align-items: center;">
            <el-button type="primary" text @click="handleEdit(scope.row)">编辑</el-button>
            <el-button @click="handlePublish(scope.row)" v-if="scope.row.status == 0 || scope.row.status == 2"
              type="success" text>发布</el-button>
            <el-button @click="handleUnpublish(scope.row)" v-if="scope.row.status == 1" type="warning"
              text>下线</el-button>
            <el-button type="danger" text @click="handleDelete(scope.row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top: 25px" :page-size="pagination.size" layout="prev, pager, next"
      :total="pagination.total" @change="handleChange" />
    <ArticleDialog v-model:modelValue="dialogVisible" :article="currentArticle" :categories="categories"
      @success="handleSuccess" />
  </div>
</template>
<script setup>
import PageHead from '@/components/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import { categoryTree, articlePage, getArticleDetail, updateArticleStatus, deleteArticle } from '@/api/admin'
import { onMounted, reactive, ref } from 'vue'
import ArticleDialog from '@/components/ArticleDialog.vue'
import { ElMessageBox, ElMessage } from 'element-plus'
const formItem = [
  { comp: 'input', label: '文章标题', prop: 'title', placeholder: '请输入文章标题' },
  { comp: 'select', label: '文章分类', prop: 'category', placeholder: '请选择文章分类' },
  {
    comp: 'select', label: '状态', prop: 'status', placeholder: '请选择状态', options: [
      { label: '已下线', value: '2' },
      { label: '已发布', value: '1' },
      { label: '草稿', value: '0' }
    ]
  }
]
//设置分页参数
const pagination = reactive({
  currentPage: 1,
  size: 10,
  total: 0
})
const handleSearch = async (formData) => {
  const params = {
    ...formData,
    ...pagination
  }
  const { records, total } = await articlePage(params)
  // console.log(records, 'articlePage')
  tableData.value = records
  pagination.total = total
}
//分页改变
const handleChange = (page) => {
  pagination.currentPage = page
  handleSearch()
}
//分类映射
const categoryMap = reactive({})
//分类列表
const categories = ref([])
//文章列表
const tableData = ref([])
//新增和编辑功能
const dialogVisible = ref(false)
onMounted(async () => {
  const data = await categoryTree()
  categories.value = (data || []).map(item => {
    categoryMap[item.id] = item.name
    return {
      label: item.name,
      value: item.id
    }
  })
  formItem[1].options = categories.value
  console.log(categories.value);
  handleSearch()
})
//新增和编辑成功后刷新列表
const handleSuccess = () => {
  dialogVisible.value = false
  handleSearch()
}
const currentArticle = ref(null)
const handleEdit = (row) => {
  // console.log("row",row);
  if (!row.id) {
    //新增
    currentArticle.value = null
    dialogVisible.value = true
  } else {
    //编辑
    getArticleDetail(row.id).then(res => {
      // console.log("res", res);
      // 去后端获取文章详情返回给当前文章对象
      currentArticle.value = res
      // console.log("currentArticle.value", currentArticle.value);
      dialogVisible.value = true
    })
  }
}
//发布
const handlePublish = (row) => {
  ElMessageBox.confirm(
    `确认发布文章${row.title}吗？`,
    '确认',
    {
      confirmButtonText: '确定发布',
      cancelButtonText: '取消',
      type: 'info'
    }).then(() => {
      updateArticleStatus(row.id, { status: 1 }).then(res => {
        ElMessage.success('发布成功')
        handleSearch()
      })
    })
}
//下线
const handleUnpublish = (row) => {
  ElMessageBox.confirm(
    `确认下线文章${row.title}吗？`,
    '确认',
    {
      confirmButtonText: '确定下线',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      updateArticleStatus(row.id, { status: 2 }).then(res => {
        ElMessage.success('下线成功')
        handleSearch()
      })
    })
}
//删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确认删除文章${row.title}吗？`,
    '确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'danger'
    }).then(() => {
      deleteArticle(row.id).then(res => {
        ElMessage.success('删除成功')
        handleSearch()
      })
    })
}
</script>