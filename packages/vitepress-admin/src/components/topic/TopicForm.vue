<template>
  <div class="topic-form">
    <h3 class="form-title">专题信息</h3>
    <a-form :model="formState" :rules="rules" layout="vertical" @finish="handleSubmit">
      <a-form-item label="专题名称" name="name">
        <a-input v-model:value="formState.name" placeholder="请输入专题名称" />
      </a-form-item>

      <a-form-item label="专题描述" name="description">
        <a-textarea v-model:value="formState.description" placeholder="请输入专题描述" :rows="4" />
      </a-form-item>

      <a-form-item label="专题图标" name="icon">
        <div class="icon-upload">
          <a-upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :before-upload="beforeUpload"
            @preview="handlePreview"
          >
            <div v-if="!formState.icon">
              <plus-outlined />
              <div style="margin-top: 8px">上传</div>
            </div>
          </a-upload>
        </div>
      </a-form-item>

      <a-form-item>
        <a-button type="primary" html-type="submit">保存</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useTopics } from '../../hooks/useTopics'

interface FormState {
  name: string
  description: string
  icon: string
}

const { selectedTopic } = useTopics()

const formState = reactive<FormState>({
  name: '',
  description: '',
  icon: ''
})

const rules = {
  name: [{ required: true, message: '请输入专题名称' }],
  description: [{ required: true, message: '请输入专题描述' }]
}

const fileList = ref([])

const beforeUpload = (_file: File) => {
  // 这里将实现文件上传逻辑
  return false
}

const handlePreview = (_file: unknown) => {
  // 这里将实现预览逻辑
}

const handleSubmit = (_values: FormState) => {
  // TODO: 实现专题更新逻辑
  console.log('Update topic:', selectedTopic.value?.id)
}
</script>

<style scoped>
.topic-form {
  width: 100%;
}

.form-title {
  margin-bottom: 24px;
  font-size: 18px;
  font-weight: 500;
}

.icon-upload {
  width: 100%;
}

:deep(.ant-upload-select) {
  width: 100px !important;
  height: 100px !important;
}
</style>
