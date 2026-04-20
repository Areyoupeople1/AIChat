<template>
  <div class="container">
    <div class="title">
      <div class="title-text">
        <h2>创建您的账户</h2>
        <p>请填写注册信息</p>
      </div>
    </div>
    <div class="form-container">
      <el-form :model="formData" :rules="rules" ref="submitFormRef" label-position="top">
        <el-form-item label="用户名或邮箱" prop="username">
          <el-input v-model="formData.username" placeholder="请输入用户名" size="large" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" size="large" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="formData.nickname" placeholder="请输入昵称(可选)" size="large" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号(可选)" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" placeholder="请输入密码" type="password" show-password size="large" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="formData.confirmPassword" placeholder="请再次输入密码" type="password" show-password
            size="large" />
        </el-form-item>
        <el-form-item>
          <el-button class="btn" type="primary" size="large" @click="submitForm(submitFormRef)">注册</el-button>
        </el-form-item>
      </el-form>
    </div>


  </div>
</template>
<script setup>
import { ref, reactive } from 'vue'
import { register } from '@/api/frontend.js'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.msg || error?.message || fallback
}

const formData = reactive({
  "username": '',
  "email": '',
  "nickname": '',
  "phone": '',
  "password": '',
  "confirmPassword": '',
  "gender": 0,
  "userType": 1
  //1普通用户 2管理员
})
const rules = reactive({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请输入确认密码', trigger: 'blur' }
  ]
})
const router = useRouter()
const submitFormRef = ref(null)
const submitForm = (formEl) => {
  if (!formEl) return
  formEl.validate((valid) => {
    if (valid) {
      register(formData).then((response) => {
        // console.log(response);
        ElMessage.success('注册成功')
        router.push('/auth/login')
      }).catch((error) => {
        ElMessage.error(getErrorMessage(error, '注册失败，请稍后重试'))
      })
    }
  })
}
</script>
<style scoped lang="scss">
.container {
  width: 384px;

  .flex-box {
    display: flex;
    align-items: center;
  }

  .title {
    .title-text {
      text-align: center;

      h2 {
        font-size: 36px;
        margin-bottom: 10px;
      }

      p {
        font-size: 18px;
        color: #6b7280;
      }
    }
  }

  .form-container {
    margin-top: 30px;

    .btn {
      margin-top: 40px;
      width: 100%;
    }

    .footer {
      padding: 30px;
      text-align: center;
    }
  }
}
</style>
