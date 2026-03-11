<template>
  <div class="table-data-viewer">
    <div class="viewer-toolbar">
      <a-space>
        <a-tag color="blue">{{ database }}.{{ table }}</a-tag>
        <a-button size="small" @click="fetchData" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button size="small" type="primary" @click="handleAddRow">
          <template #icon><PlusOutlined /></template>
          新增行
        </a-button>
        <a-popconfirm
          v-if="selectedRowKeys.length > 0"
          :title="`确定删除选中的 ${selectedRowKeys.length} 行数据？`"
          @confirm="handleBatchDelete"
          ok-text="确定"
          ok-type="danger"
        >
          <a-button size="small" danger>
            <template #icon><DeleteOutlined /></template>
            删除 ({{ selectedRowKeys.length }})
          </a-button>
        </a-popconfirm>
      </a-space>
      <a-space>
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索文本列..."
          style="width: 220px"
          size="small"
          allow-clear
          @search="handleSearch"
          @pressEnter="handleSearch"
        />
        <span class="data-stats" v-if="totalRows >= 0"> 共 {{ totalRows }} 行 </span>
      </a-space>
    </div>

    <div class="viewer-table-wrap">
      <a-table
        :dataSource="rows"
        :columns="displayColumns"
        :loading="loading"
        :pagination="paginationConfig"
        :row-selection="rowSelection"
        :scroll="{ x: scrollX }"
        :row-key="getRowKey"
        size="small"
        bordered
        class="data-table"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === '__actions'">
            <a-space size="small">
              <a-tooltip title="编辑">
                <a-button size="small" type="link" @click="handleEditRow(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm
                title="确定删除此行？"
                @confirm="handleDeleteRow(record)"
                ok-text="确定"
                ok-type="danger"
              >
                <a-button size="small" type="link" danger>
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
          <template v-else>
            <div
              class="cell-content"
              :class="{ 'cell-null': record[column.dataIndex] === null }"
              @dblclick="startCellEdit(record, column.dataIndex, index)"
            >
              <template
                v-if="
                  editingCell &&
                  editingCell.rowIndex === index &&
                  editingCell.column === column.dataIndex
                "
              >
                <a-input
                  v-model:value="editingCell.value"
                  size="small"
                  class="cell-input"
                  ref="cellInputRef"
                  @blur="saveCellEdit"
                  @keydown.enter="saveCellEdit"
                  @keydown.escape="cancelCellEdit"
                />
              </template>
              <template v-else>
                {{ formatCellValue(record[column.dataIndex]) }}
              </template>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Add / Edit Row Modal -->
    <a-modal
      v-model:open="showRowModal"
      :title="isEditing ? '编辑行' : '新增行'"
      :width="640"
      @ok="handleSaveRow"
      :confirmLoading="saving"
      :okText="isEditing ? '保存' : '新增'"
      destroyOnClose
    >
      <a-form :label-col="{ span: 7 }" :wrapper-col="{ span: 16 }" class="row-form">
        <a-form-item v-for="col in columnDefs" :key="col.name" :label="col.name">
          <a-input
            v-if="!isAutoIncrementCol(col) || isEditing"
            v-model:value="rowFormData[col.name]"
            :placeholder="getColumnPlaceholder(col)"
            :disabled="isEditing && isPrimaryKeyCol(col.name)"
            allow-clear
          />
          <a-input v-else disabled placeholder="AUTO_INCREMENT" />
          <div class="field-hint">
            <a-tag size="small">{{ col.type }}</a-tag>
            <a-tag v-if="col.key === 'PRI'" color="gold" size="small">PK</a-tag>
            <a-tag v-if="!col.nullable" color="red" size="small">NOT NULL</a-tag>
            <a-tag v-if="col.extra" size="small">{{ col.extra }}</a-tag>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import type { TableProps } from 'ant-design-vue'
import { ReloadOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'
import { databaseApi, type ColumnInfo, type TableDataResult } from '@/services/api'

interface EditingCell {
  rowIndex: number
  column: string
  value: string
  originalValue: unknown
}

const props = defineProps<{
  database: string
  table: string
}>()

const loading = ref(false)
const saving = ref(false)
const rows = ref<Record<string, unknown>[]>([])
const columnDefs = ref<ColumnInfo[]>([])
const primaryKeys = ref<string[]>([])
const totalRows = ref(0)
const currentPage = ref(1)
const pageSize = ref(100)
const searchText = ref('')
const sortField = ref<string>()
const sortOrder = ref<'ASC' | 'DESC'>()
const selectedRowKeys = ref<string[]>([])
const editingCell = ref<EditingCell | null>(null)
const cellInputRef = ref<InstanceType<typeof HTMLInputElement> | null>(null)

const showRowModal = ref(false)
const isEditing = ref(false)
const editingRowPk = ref<Record<string, unknown>>({})
const rowFormData = ref<Record<string, unknown>>({})

const getRowKey = (record: Record<string, unknown>, index?: number): string => {
  if (primaryKeys.value.length > 0) {
    return primaryKeys.value.map(k => String(record[k] ?? '')).join('__')
  }
  return String(index ?? 0)
}

const displayColumns = computed(() => {
  const cols = columnDefs.value.map(col => ({
    title: col.name,
    dataIndex: col.name,
    key: col.name,
    width: getColumnWidth(col),
    ellipsis: true,
    sorter: true,
    resizable: true
  }))
  cols.push({
    title: '操作',
    key: '__actions',
    dataIndex: '__actions',
    width: 100,
    ellipsis: false,
    sorter: false,
    resizable: false
  } as (typeof cols)[number])
  return cols
})

const scrollX = computed(() => {
  return displayColumns.value.reduce((sum, c) => sum + (c.width || 150), 0)
})

const paginationConfig = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: totalRows.value,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  pageSizeOptions: ['50', '100', '200', '500']
}))

const rowSelection = computed<TableProps['rowSelection']>(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys as string[]
  }
}))

function getColumnWidth(col: ColumnInfo): number {
  const type = col.type.toLowerCase()
  if (/tinyint|smallint|bool/.test(type)) return 80
  if (/int|decimal|float|double/.test(type)) return 120
  if (/datetime|timestamp/.test(type)) return 180
  if (/date/.test(type)) return 120
  if (/text|blob|json/.test(type)) return 250
  return 150
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isAutoIncrementCol(col: ColumnInfo): boolean {
  return col.extra.toLowerCase().includes('auto_increment')
}

function isPrimaryKeyCol(name: string): boolean {
  return primaryKeys.value.includes(name)
}

function getColumnPlaceholder(col: ColumnInfo): string {
  const parts: string[] = [col.type]
  if (col.defaultValue !== null) parts.push(`默认: ${col.defaultValue}`)
  if (col.nullable) parts.push('可为空')
  return parts.join(' | ')
}

function getPkValues(record: Record<string, unknown>): Record<string, unknown> {
  const pkValues: Record<string, unknown> = {}
  primaryKeys.value.forEach(k => {
    pkValues[k] = record[k]
  })
  return pkValues
}

async function fetchData() {
  loading.value = true
  try {
    const result: TableDataResult = await databaseApi.getTableData({
      database: props.database,
      table: props.table,
      page: currentPage.value,
      pageSize: pageSize.value,
      orderBy: sortField.value,
      orderDir: sortOrder.value,
      search: searchText.value || undefined
    })
    columnDefs.value = result.columns
    rows.value = result.rows
    totalRows.value = result.total
    primaryKeys.value = result.primaryKeys
    selectedRowKeys.value = []
  } catch (error) {
    const msg = error instanceof Error ? error.message : '加载数据失败'
    message.error(msg)
  } finally {
    loading.value = false
  }
}

function handleTableChange(
  pagination: { current?: number; pageSize?: number },
  _filters: Record<string, unknown>,
  sorter: { field?: string; order?: string }
) {
  currentPage.value = pagination.current || 1
  pageSize.value = pagination.pageSize || 100

  if (sorter.field && sorter.order) {
    sortField.value = sorter.field
    sortOrder.value = sorter.order === 'ascend' ? 'ASC' : 'DESC'
  } else {
    sortField.value = undefined
    sortOrder.value = undefined
  }
  fetchData()
}

function handleSearch() {
  currentPage.value = 1
  fetchData()
}

// Inline cell editing
function startCellEdit(record: Record<string, unknown>, column: string, rowIndex: number) {
  if (primaryKeys.value.length === 0) {
    message.warning('该表没有主键，无法进行行内编辑')
    return
  }
  editingCell.value = {
    rowIndex,
    column,
    value: record[column] === null ? '' : String(record[column] ?? ''),
    originalValue: record[column]
  }
  nextTick(() => {
    const input = document.querySelector('.cell-input input') as HTMLInputElement
    input?.focus()
  })
}

async function saveCellEdit() {
  if (!editingCell.value) return
  const { rowIndex, column, value, originalValue } = editingCell.value

  const newValue = value === '' ? null : value
  if (newValue === originalValue || (newValue === null && originalValue === null)) {
    editingCell.value = null
    return
  }

  const record = rows.value[rowIndex]
  const pkValues = getPkValues(record)

  try {
    await databaseApi.updateRow(props.database, props.table, pkValues, { [column]: newValue })
    record[column] = newValue
    message.success('更新成功')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '更新失败'
    message.error(msg)
  }
  editingCell.value = null
}

function cancelCellEdit() {
  editingCell.value = null
}

// Row modal operations
function handleAddRow() {
  isEditing.value = false
  editingRowPk.value = {}
  const formData: Record<string, unknown> = {}
  columnDefs.value.forEach(col => {
    formData[col.name] = col.defaultValue ?? ''
  })
  rowFormData.value = formData
  showRowModal.value = true
}

function handleEditRow(record: Record<string, unknown>) {
  if (primaryKeys.value.length === 0) {
    message.warning('该表没有主键，无法编辑')
    return
  }
  isEditing.value = true
  editingRowPk.value = getPkValues(record)
  const formData: Record<string, unknown> = {}
  columnDefs.value.forEach(col => {
    formData[col.name] = record[col.name] === null ? '' : String(record[col.name] ?? '')
  })
  rowFormData.value = formData
  showRowModal.value = true
}

async function handleSaveRow() {
  saving.value = true
  try {
    if (isEditing.value) {
      const changes: Record<string, unknown> = {}
      columnDefs.value.forEach(col => {
        if (!isPrimaryKeyCol(col.name)) {
          changes[col.name] = rowFormData.value[col.name]
        }
      })
      await databaseApi.updateRow(props.database, props.table, editingRowPk.value, changes)
      message.success('更新成功')
    } else {
      const row: Record<string, unknown> = {}
      columnDefs.value.forEach(col => {
        if (!isAutoIncrementCol(col) && rowFormData.value[col.name] !== '') {
          row[col.name] = rowFormData.value[col.name]
        }
      })
      await databaseApi.insertRow(props.database, props.table, row)
      message.success('新增成功')
    }
    showRowModal.value = false
    await fetchData()
  } catch (error) {
    const msg = error instanceof Error ? error.message : '操作失败'
    message.error(msg)
  } finally {
    saving.value = false
  }
}

async function handleDeleteRow(record: Record<string, unknown>) {
  if (primaryKeys.value.length === 0) {
    message.warning('该表没有主键，无法删除')
    return
  }
  try {
    await databaseApi.deleteRow(props.database, props.table, getPkValues(record))
    message.success('删除成功')
    await fetchData()
  } catch (error) {
    const msg = error instanceof Error ? error.message : '删除失败'
    message.error(msg)
  }
}

async function handleBatchDelete() {
  if (primaryKeys.value.length === 0) {
    message.warning('该表没有主键，无法批量删除')
    return
  }
  const toDelete = rows.value.filter(r => selectedRowKeys.value.includes(getRowKey(r)))
  let successCount = 0
  for (const record of toDelete) {
    try {
      await databaseApi.deleteRow(props.database, props.table, getPkValues(record))
      successCount++
    } catch {
      // continue on error
    }
  }
  message.success(`成功删除 ${successCount} 行`)
  await fetchData()
}

watch(
  () => [props.database, props.table],
  () => {
    currentPage.value = 1
    searchText.value = ''
    sortField.value = undefined
    sortOrder.value = undefined
    fetchData()
  },
  { immediate: true }
)
</script>

<style scoped>
.table-data-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.data-stats {
  font-size: 12px;
  color: #888;
}

.viewer-table-wrap {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.data-table :deep(.ant-table) {
  font-size: 12px;
}

.data-table :deep(.ant-table-cell) {
  padding: 4px 8px !important;
}

.cell-content {
  min-height: 22px;
  cursor: default;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-null {
  color: #bbb;
  font-style: italic;
}

.cell-input {
  margin: -4px -8px;
  width: calc(100% + 16px);
}

.cell-input :deep(input) {
  font-size: 12px;
  border-radius: 0;
}

.row-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

.field-hint {
  margin-top: 4px;
}

.field-hint :deep(.ant-tag) {
  font-size: 11px;
  line-height: 18px;
  padding: 0 4px;
}
</style>
