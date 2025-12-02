<template>
  <div class="article-list">
    <div class="list-header">
      <h3>文章列表</h3>
      <a-button type="primary" @click="handleAddArticle"> 添加文章 </a-button>
    </div>

    <a-table :columns="columns" :data-source="articles" :pagination="false" :scroll="{ y: 400 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-space>
            <a @click="handleEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a-popconfirm title="确定要删除这篇文章吗？" @confirm="handleDelete(record)">
              <a class="delete-link">删除</a>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useArticles } from '../../hooks/useArticles'

interface Article {
  id: string
  title: string
  createTime: string
}

const columns = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    width: '40%'
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: '30%'
  },
  {
    title: '操作',
    key: 'action',
    width: '30%'
  }
]

const { articles, deleteArticle } = useArticles()

const handleAddArticle = () => {
  // 这里将实现添加文章的逻辑
}

const handleEdit = (_record: Article) => {
  // 这里将实现编辑文章的逻辑
}

const handleDelete = async (record: Article) => {
  try {
    await deleteArticle(record.id)
    message.success('删除成功')
  } catch {
    message.error('删除失败')
  }
}
</script>

<style scoped>
.article-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.delete-link {
  color: #ff4d4f;
}
</style>
