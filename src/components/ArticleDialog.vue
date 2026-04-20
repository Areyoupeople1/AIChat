<template>
  <!-- 弹窗 -->
  <el-dialog :title="isEdit ? '编辑文章' : '新增文章'" v-model="dialogVisible" width="80%" @close="handleClose">
    <el-form :model="formData" ref="formRef" :rules="rules" label-width="120px">
      <el-form-item label="文章标题" prop="title">
        <el-input v-model="formData.title" placeholder="请输入文章标题" maxlength="200" show-word-limit clearable></el-input>
      </el-form-item>
      <el-form-item label="所属分类" prop="categoryId">
        <el-select v-model="formData.categoryId" placeholder="请选择分类">
          <el-option v-for="item in props.categories" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="文章摘要" prop="summary">
        <el-input type="textarea" v-model="formData.summary" placeholder="请输入文章摘要(可选)" maxlength="1000" show-word-limit
          :rows="4"></el-input>
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select v-model="formData.tagArray" placeholder="请输入文章标签(逗号分隔)" multiple filterable allow-create
          style="width: 100%;">
          <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>
      <el-form-item label="封面图片">
        <div class="cover-upload">
          <el-upload class="avatar-uploader" action="#" :show-file-list="false" :before-upload="beforeUpload"
            :http-request="handleUploadRequest" accept="image/*">
            <div class="cover-placeholder" v-if="!imgUrl">
              <p>点击上传封面</p>
            </div>
            <img v-else :src="imgUrl" class="cover-image" alt="封面图片">
          </el-upload>
          <div v-if="imgUrl" class="cover-remove">
            <el-button type="danger" size="mini" @click="removeCover">移除封面</el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="文章内容" prop="content">
        <RichTextEditor v-model="formData.content" placeholder="请输入文章内容" :maxCharCount="5000"
          @change="handleContentChange" @create="handleEditorCreate" min-height="400px" />
      </el-form-item>
    </el-form>
    <div v-if="btnPreview">
      <h3>内容预览</h3>
      <div v-html="formData.content"></div>
    </div>
    <template #footer>
      <el-button @click="btnPreview = !btnPreview">{{ btnPreview ? '隐藏预览' : '预览效果' }}</el-button>
      <el-button @click="handleClose">取消</el-button>
      <!-- 按钮上的 :loading (防重复提交) -->
      <el-button type="primary" @click="handleSubmit()" :loading="loading">{{ isEdit ? '更新文章' : '新增文章' }}</el-button>
    </template>
  </el-dialog>
</template>
<script setup>
import { ref, computed, reactive, nextTick, watch } from 'vue'
import { uploadFile } from '@/api/admin'
import { ElMessage } from 'element-plus'
import { fileBaseUrl } from '@/config/index'
import RichTextEditor from '@/components/RichTextEditor.vue'
import { createArticle, updateArticle } from '@/api/admin'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    default: () => []
  },
  article: {
    type: Object,
    default: null
  }
})
const commonTags = [
  '情绪管理', '焦虑', '抑郁', '压力', '睡眠',
  '冥想', '正念', '放松', '心理健康', '自我成长',
  '人际关系', '工作压力', '学习方法', '生活技巧'
]
const emit = defineEmits(['update:modelValue', 'success'])
const dialogVisible = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})
//根据数据判断当前是否点的是编辑
const isEdit = computed(() => !!props.article?.id)//props.article?.id：如果 article 有值就取 id，没有就得到 undefined（可选链 ?.）
//监听编辑数据
watch(() => props.article, (newVal) => {
  if (newVal) {
    nextTick(() => {
      // formData是响应式对象，不能整体赋值，所以我们用assign方法，将newVal的属性合并到formData中
      Object.assign(formData, newVal)//Object.assign （静态方法）是因为它本来就是 JS 内置对象 Object 提供的通用方法
      //使用现有id
      businessId.value = newVal.id
      //封面的url
      // 后端返回 cover 字段，映射到 formData.coverImage 供模板使用
      formData.coverImage = newVal.cover || ''
      formData.categoryId = newVal.category_id || ''
      imgUrl.value = newVal.cover ? fileBaseUrl + newVal.cover : ''
    })
  }
})
const handleClose = () => {
  // formRef.value拿到的表单的实例对象，调用resetFields方法，重置表单数据
  formRef.value.resetFields()
  businessId.value = null
  formData.tagArray = []//重置标签
  //重置封面图片和数据
  removeCover()
  emit('update:modelValue', false)//update:属性名
}
//表单数据
const formData = reactive({
  title: '',
  content: '',
  coverImage: '',   // 模板绑定用 coverImage，提交前映射成后端的 cover
  categoryId: '',   // 模板绑定用 categoryId，提交前映射成后端的 category_id
  summary: '',
  tags: '',
  tagArray: [],
  id: ''
})
const rules = reactive({
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { max: 200, message: '文章标题最多200个字符', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入文章内容', trigger: 'blur' },
    { max: 5000, message: '文章内容最多5000个字符', trigger: 'blur' }
  ]
})
//上传图片
const imgUrl = ref('')
const beforeUpload = (file) => {
  //针对上传的文件进行校验
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('上传封面图片只能是图片格式!')
    return false
  }
  // 判断大小
  if (!isLt5M) {
    ElMessage.error('上传封面图片大小不能超过5MB!')
    return false
  }
  return true
}
//业务id
const businessId = ref(null)
const handleUploadRequest = async ({ file }) => {
  const fileRes = await uploadFile(file)
  // 新后端返回 { url: '/uploads/xxx.jpg' }
  imgUrl.value = fileBaseUrl + fileRes.url
  formData.coverImage = fileRes.url
}
//移除封面
const removeCover = () => {
  imgUrl.value = ''
  formData.coverImage = ''
}
//富文本内容改变
const handleContentChange = (data) => {
  // console.log(data, 'neirong');
  formData.content = data.html
}
//富文本创建
const editorInstance = ref(null)
const handleEditorCreate = (editor) => {
  // console.log(editor, 'editor');
  editorInstance.value = editor
  if (formData.content && editor) {
    nextTick(() => {
      editor.setHtml(formData.content)
    })
  }
}
const btnPreview = ref(false)
//提交
const formRef = ref(null)
const loading = ref(false)//默认是false,点击提交后，立即给提交按钮加上 :loading="true" 状态，锁定交互。loading防止重复提交
const handleSubmit = () => {
  //先进行表单校验
  formRef.value.validate((valid, fields) => {
    if (valid) {
      loading.value = true
      // 把前端 camelCase 字段映射成后端 snake_case 字段
      const submitData = {
        title:       formData.title,
        content:     formData.content,
        cover:       formData.coverImage,     // coverImage → cover
        category_id: formData.categoryId,     // categoryId → category_id
        summary:     formData.summary,
        tags:        formData.tagArray.join(','),
        author_name: '管理员',
      }
      if (!isEdit.value) {//证明是新增，不是编辑状态
        submitData.id = businessId.value
        createArticle(submitData).then(res => {
          loading.value = false
          emit('success')
          //点击创建后关闭新增页面
          handleClose()
        })
      } else {
        updateArticle(props.article.id, submitData).then(res => {
          loading.value = false
          emit('success')
          //点击创建后关闭新增页面
          handleClose()
        })
      }

    }
  })
}
</script>
<style scoped lang="scss">
.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 120px;
  color: #8b949e;
  background: #f6f8fa;
}

.cover-image {
  width: 200px;
  height: 120px;
  display: block;
}
</style>
