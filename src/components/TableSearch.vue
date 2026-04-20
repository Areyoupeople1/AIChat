<template>
  <el-form :model="formData" ref="ruleFormRef">
    <el-row :gutter="24">
      <template v-for="item in formItemAttrs" :key="item.prop">
        <el-col v-bind="item.col">
          <el-form-item :label="item.label" :prop="item.prop">
            <component v-model="formData[item.prop]" :is="isComp(item.comp)" :placeholder="item.placeholder">
              <template v-if="item.comp === 'select'">
                <el-option v-for="opt in item.options" :key="opt.value" :label="opt.label" :value="opt.value" />
              </template>
            </component>
          </el-form-item>
        </el-col>
      </template>
    </el-row>
    <el-row>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button type="default" @click="handleReset(ruleFormRef)">重置</el-button>
    </el-row>
  </el-form>
</template>
<script setup>
import { ref, reactive, computed } from 'vue'
const props = defineProps({
  formItem: {
    type: Array,
    default: () => []
  }
})
const emit = defineEmits(['search'])
const formItemAttrs = computed(() => {
  const { formItem } = props
  formItem.forEach(item => {
    item.col = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }
  })
  return formItem
})
//创建表单数据响应式对象
const ruleFormRef = ref()
const formData = reactive({})
const isComp = (comp) => {
  return {
    input: 'el-input',
    select: 'el-select',
  }[comp]
}
const handleSearch = () => {
  emit('search', { ...formData })
}
const handleReset = (formEl) => {
  //先重置表单，再触发初始查询
  // console.log("formData",formData);
  if (!formEl) return
  formEl.resetFields()
  emit('search', { ...formData })
}
</script>
