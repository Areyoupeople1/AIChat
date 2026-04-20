<template>
  <div>
    <PageHead title="咨询记录" />
    <!-- 用户列表 -->
    <el-table :data="tableData" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.is_disabled ? 'danger' : 'success'">
            {{ scope.row.is_disabled ? '已禁用' : '正常' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" width="160" />
      <el-table-column prop="last_login" label="最后登录" width="160" />
      <el-table-column label="操作" width="120">
        <template #default="scope">
          <el-button type="primary" text @click="viewUserConversations(scope.row)">查看会话</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 会话列表弹窗 -->
    <el-dialog v-model="showConvDialog" :title="`${selectedUser?.username} 的会话记录`" width="70%" :close-on-click-modal="false">
      <div v-loading="loadingConv">
        <div v-if="conversations.length === 0 && !loadingConv" style="text-align:center;color:#999;padding:40px">
          该用户暂无会话记录
        </div>
        <el-table v-else :data="conversations">
          <el-table-column prop="name" label="会话标题" />
          <el-table-column label="创建时间" width="160">
            <template #default="scope">{{ formatTimestamp(scope.row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="160">
            <template #default="scope">{{ formatTimestamp(scope.row.updated_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button type="primary" @click="showConvDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import PageHead from '@/components/PageHead.vue'
import { getAdminUsers, getUserConversations } from '@/api/admin'

const tableData = ref([])

const formatTimestamp = (ts) => {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

// 加载用户列表（role=user 的）
const loadUsers = () => {
  getAdminUsers().then(res => {
    tableData.value = (res || []).filter(u => u.role === 'user')
  })
}

// 查看某用户会话
const showConvDialog = ref(false)
const loadingConv = ref(false)
const conversations = ref([])
const selectedUser = ref(null)

const viewUserConversations = (user) => {
  selectedUser.value = user
  conversations.value = []
  loadingConv.value = true
  showConvDialog.value = true

  getUserConversations(user.id).then(res => {
    // res 是 Dify 原始响应 { data: [...] }
    conversations.value = res?.data || []
  }).finally(() => {
    loadingConv.value = false
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped lang="scss">
</style>
