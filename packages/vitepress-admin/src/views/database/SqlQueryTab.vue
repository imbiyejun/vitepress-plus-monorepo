<template>
  <div class="query-layout">
    <div class="query-toolbar">
      <a-select
        v-model:value="queryDatabase"
        placeholder="选择数据库"
        style="width: 200px"
        :options="databaseOptions"
      />
      <a-button
        type="primary"
        :loading="executing"
        :disabled="!queryDatabase || !sqlContent.trim()"
        @click="handleExecuteQuery"
      >
        <template #icon><CaretRightOutlined /></template>
        执行
      </a-button>
      <span v-if="queryResult" class="query-stats">
        <a-tag v-if="queryResult.rows.length > 0" color="blue">
          {{ queryResult.rows.length }} 行
        </a-tag>
        <a-tag v-if="queryResult.affectedRows > 0" color="green">
          影响 {{ queryResult.affectedRows }} 行
        </a-tag>
        <a-tag color="default">{{ queryResult.executionTime }}ms</a-tag>
      </span>
    </div>
    <a-textarea
      v-model:value="sqlContent"
      placeholder="输入 SQL 语句... (Ctrl+Enter 执行)"
      :auto-size="{ minRows: 6, maxRows: 12 }"
      class="sql-editor"
      @keydown.ctrl.enter="handleExecuteQuery"
    />
    <div class="query-result-area" v-if="queryResult">
      <div class="result-message">{{ queryResult.message }}</div>
      <a-table
        v-if="queryResult.rows.length > 0"
        :dataSource="queryResult.rows"
        :columns="queryResultColumns"
        :pagination="{ pageSize: 50 }"
        :scroll="{ x: 'max-content' }"
        rowKey="_rowIndex"
        size="small"
        bordered
        class="result-table"
      />
    </div>
    <a-alert
      v-if="queryError"
      :message="queryError"
      type="error"
      show-icon
      closable
      style="margin-top: 12px"
      @close="queryError = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CaretRightOutlined } from '@ant-design/icons-vue'
import { databaseApi, type QueryResult } from '@/services/api'

const props = defineProps<{
  databaseOptions: { value: string; label: string }[]
  initialDatabase?: string
}>()

const queryDatabase = ref(props.initialDatabase || '')
const sqlContent = ref('')
const executing = ref(false)
const queryResult = ref<QueryResult | null>(null)
const queryError = ref('')

const queryResultColumns = computed(() => {
  if (!queryResult.value) return []
  return queryResult.value.columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    width: 150
  }))
})

const handleExecuteQuery = async () => {
  if (!queryDatabase.value || !sqlContent.value.trim()) return
  executing.value = true
  queryError.value = ''
  queryResult.value = null
  try {
    const result = await databaseApi.executeQuery(queryDatabase.value, sqlContent.value.trim())
    result.rows = result.rows.map((row, idx) => ({ ...row, _rowIndex: idx }))
    queryResult.value = result
  } catch (error) {
    queryError.value = error instanceof Error ? error.message : '查询执行失败'
  } finally {
    executing.value = false
  }
}
</script>

<style scoped>
.query-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.query-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.query-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.sql-editor {
  font-family: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #282c34;
  color: #abb2bf;
  border: 1px solid #3e4451;
  resize: none;
  border-radius: 6px;
  flex-shrink: 0;
}

.sql-editor:focus {
  border-color: #528bff;
  box-shadow: 0 0 0 2px rgba(82, 139, 255, 0.2);
}

.sql-editor :deep(textarea::placeholder) {
  color: #636d83;
}

.query-result-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 12px;
  min-height: 0;
  overflow: auto;
}

.result-message {
  font-size: 13px;
  color: #52c41a;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.result-table {
  flex: 1;
}

.result-table :deep(.ant-table) {
  font-size: 12px;
}

.result-table :deep(.ant-table-cell) {
  padding: 4px 8px !important;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
