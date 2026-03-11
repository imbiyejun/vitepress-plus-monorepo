<template>
  <div class="database-manager">
    <div class="db-header">
      <div class="header-content">
        <h2>数据库管理</h2>
        <a-space>
          <a-button :loading="testingConnection" @click="handleTestConnection">
            <template #icon><ApiOutlined /></template>
            测试连接
          </a-button>
        </a-space>
      </div>
    </div>

    <a-spin :spinning="loading">
      <template v-if="!dbStatus.configured">
        <a-result status="warning" title="数据库未配置">
          <template #subTitle>
            <p>请在 .env 文件中配置以下变量：</p>
            <div class="config-hint">
              <pre>
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root123456</pre
              >
            </div>
            <a-alert
              message="提示：如果刚通过软件管理安装了 MySQL，默认账号密码为 root / root123456"
              type="info"
              show-icon
              style="margin-top: 16px; text-align: left"
            />
          </template>
        </a-result>
      </template>

      <template v-else>
        <a-tabs v-model:activeKey="activeTab" class="db-tabs">
          <!-- Database Overview Tab -->
          <a-tab-pane key="overview" tab="数据库概览">
            <div class="overview-layout">
              <div class="db-sidebar">
                <div class="sidebar-header">
                  <span class="sidebar-title">数据库列表</span>
                  <a-space size="small">
                    <a-button size="small" @click="loadDatabases" :loading="loadingDatabases">
                      <template #icon><ReloadOutlined /></template>
                    </a-button>
                    <a-button size="small" type="primary" @click="showCreateDbModal = true">
                      <template #icon><PlusOutlined /></template>
                    </a-button>
                  </a-space>
                </div>
                <a-menu
                  v-model:selectedKeys="selectedDbKeys"
                  mode="inline"
                  class="db-menu"
                  @click="handleDbSelect"
                >
                  <a-menu-item v-for="db in databases" :key="db.name">
                    <template #icon><DatabaseOutlined /></template>
                    <span>{{ db.name }}</span>
                    <a-badge :count="db.tables" :overflow-count="999" class="table-count" />
                  </a-menu-item>
                </a-menu>
              </div>

              <div class="db-main">
                <template v-if="!selectedDatabase">
                  <a-empty description="请选择一个数据库" />
                </template>
                <template v-else>
                  <div class="main-toolbar">
                    <span class="db-name-display">
                      <DatabaseOutlined /> {{ selectedDatabase }}
                    </span>
                    <a-space>
                      <a-button size="small" @click="loadTables" :loading="loadingTables">
                        <template #icon><ReloadOutlined /></template>
                        刷新表
                      </a-button>
                      <a-popconfirm
                        :title="`确定删除数据库 ${selectedDatabase}？此操作不可撤销！`"
                        @confirm="handleDropDatabase"
                        ok-text="确定删除"
                        ok-type="danger"
                      >
                        <a-button size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                          删除数据库
                        </a-button>
                      </a-popconfirm>
                    </a-space>
                  </div>

                  <a-table
                    :dataSource="tables"
                    :columns="tableColumns"
                    :loading="loadingTables"
                    :pagination="false"
                    rowKey="name"
                    size="small"
                    class="tables-list"
                    @row-click="handleTableClick"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'name'">
                        <a @click.prevent="handleTableClick(record)">
                          <TableOutlined /> {{ record.name }}
                        </a>
                      </template>
                      <template v-else-if="column.key === 'rows'">
                        {{ record.rows ?? '-' }}
                      </template>
                    </template>
                  </a-table>
                </template>
              </div>
            </div>
          </a-tab-pane>

          <!-- SQL Query Tab -->
          <a-tab-pane key="query" tab="SQL 查询">
            <div class="query-layout">
              <div class="query-toolbar">
                <a-select
                  v-model:value="queryDatabase"
                  placeholder="选择数据库"
                  style="width: 200px"
                  :options="databases.map(d => ({ value: d.name, label: d.name }))"
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
                placeholder="输入 SQL 语句..."
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
          </a-tab-pane>

          <!-- Account Management Tab -->
          <a-tab-pane key="account" tab="账号管理">
            <div class="account-layout">
              <a-card title="当前连接信息" size="small" style="margin-bottom: 16px">
                <a-descriptions :column="2" size="small">
                  <a-descriptions-item label="主机">{{ dbStatus.host }}</a-descriptions-item>
                  <a-descriptions-item label="端口">{{ dbStatus.port }}</a-descriptions-item>
                  <a-descriptions-item label="用户名">{{ dbStatus.username }}</a-descriptions-item>
                </a-descriptions>
              </a-card>

              <a-card title="MySQL 默认凭据" size="small" style="margin-bottom: 16px">
                <a-alert
                  message="通过软件管理安装 MySQL 后，默认凭据如下："
                  type="info"
                  show-icon
                  style="margin-bottom: 12px"
                />
                <a-descriptions :column="1" size="small" bordered>
                  <a-descriptions-item label="默认用户名">root</a-descriptions-item>
                  <a-descriptions-item label="默认密码">root123456</a-descriptions-item>
                </a-descriptions>
              </a-card>

              <a-card title="修改密码" size="small">
                <a-form
                  :model="passwordForm"
                  :label-col="{ span: 6 }"
                  :wrapper-col="{ span: 16 }"
                  @finish="handleChangePassword"
                >
                  <a-form-item
                    label="用户名"
                    name="currentUsername"
                    :rules="[{ required: true, message: '请输入用户名' }]"
                  >
                    <a-input v-model:value="passwordForm.currentUsername" placeholder="root" />
                  </a-form-item>
                  <a-form-item
                    label="当前密码"
                    name="currentPassword"
                    :rules="[{ required: true, message: '请输入当前密码' }]"
                  >
                    <a-input-password v-model:value="passwordForm.currentPassword" />
                  </a-form-item>
                  <a-form-item
                    label="新密码"
                    name="newPassword"
                    :rules="[{ required: true, message: '请输入新密码' }]"
                  >
                    <a-input-password v-model:value="passwordForm.newPassword" />
                  </a-form-item>
                  <a-form-item label="确认密码" name="confirmPassword" :rules="confirmRules">
                    <a-input-password v-model:value="passwordForm.confirmPassword" />
                  </a-form-item>
                  <a-form-item :wrapper-col="{ offset: 6, span: 16 }">
                    <a-button type="primary" html-type="submit" :loading="changingPassword">
                      修改密码
                    </a-button>
                  </a-form-item>
                </a-form>
                <a-alert
                  message="修改密码后请记得同步更新 .env 文件中的 DB_PASSWORD"
                  type="warning"
                  show-icon
                />
              </a-card>
            </div>
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-spin>

    <!-- Create Database Modal -->
    <a-modal
      v-model:open="showCreateDbModal"
      title="创建数据库"
      @ok="handleCreateDatabase"
      :confirmLoading="creatingDb"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="数据库名称" required>
          <a-input v-model:value="newDbName" placeholder="my_database" />
        </a-form-item>
        <a-form-item label="字符集">
          <a-select v-model:value="newDbCharset" style="width: 100%">
            <a-select-option value="utf8mb4">utf8mb4 (推荐)</a-select-option>
            <a-select-option value="utf8">utf8</a-select-option>
            <a-select-option value="latin1">latin1</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Table Structure Modal -->
    <a-modal
      v-model:open="showColumnsModal"
      :title="`表结构 - ${viewingTable}`"
      width="700px"
      :footer="null"
    >
      <a-table
        :dataSource="tableColumnsData"
        :columns="columnInfoColumns"
        :loading="loadingColumns"
        :pagination="false"
        rowKey="name"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'key'">
            <a-tag v-if="record.key === 'PRI'" color="gold">PRI</a-tag>
            <a-tag v-else-if="record.key === 'UNI'" color="blue">UNI</a-tag>
            <a-tag v-else-if="record.key === 'MUL'" color="green">MUL</a-tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'nullable'">
            <a-tag :color="record.nullable ? 'default' : 'red'">
              {{ record.nullable ? 'YES' : 'NO' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import {
  ApiOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  TableOutlined,
  CaretRightOutlined
} from '@ant-design/icons-vue'
import {
  databaseApi,
  type DatabaseStatus as DbStatus,
  type DatabaseInfo,
  type TableInfo,
  type ColumnInfo,
  type QueryResult
} from '@/services/api'

const loading = ref(false)
const testingConnection = ref(false)
const activeTab = ref('overview')
const dbStatus = ref<DbStatus>({ configured: false })

// Overview state
const databases = ref<DatabaseInfo[]>([])
const loadingDatabases = ref(false)
const selectedDbKeys = ref<string[]>([])
const selectedDatabase = computed(() => selectedDbKeys.value[0] || '')
const tables = ref<TableInfo[]>([])
const loadingTables = ref(false)

// Create database
const showCreateDbModal = ref(false)
const newDbName = ref('')
const newDbCharset = ref('utf8mb4')
const creatingDb = ref(false)

// Table columns
const showColumnsModal = ref(false)
const viewingTable = ref('')
const tableColumnsData = ref<ColumnInfo[]>([])
const loadingColumns = ref(false)

// SQL Query state
const queryDatabase = ref<string>('')
const sqlContent = ref('')
const executing = ref(false)
const queryResult = ref<QueryResult | null>(null)
const queryError = ref('')

// Account state
const changingPassword = ref(false)
const passwordForm = reactive({
  currentUsername: 'root',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const confirmRules: Rule[] = [
  { required: true, message: '请确认新密码' },
  {
    validator: (_rule: Rule, value: string) => {
      if (value && value !== passwordForm.newPassword) {
        return Promise.reject('两次输入的密码不一致')
      }
      return Promise.resolve()
    }
  }
]

const tableColumns = [
  { title: '表名', key: 'name', dataIndex: 'name' },
  { title: '行数', key: 'rows', dataIndex: 'rows', width: 100 },
  { title: '引擎', dataIndex: 'engine', width: 100 },
  { title: '大小', dataIndex: 'size', width: 100 },
  { title: '排序规则', dataIndex: 'collation', width: 180 },
  { title: '备注', dataIndex: 'comment', ellipsis: true }
]

const columnInfoColumns = [
  { title: '列名', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '可空', dataIndex: 'nullable', key: 'nullable', width: 80 },
  { title: '键', dataIndex: 'key', key: 'key', width: 60 },
  { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 120 },
  { title: '额外', dataIndex: 'extra', key: 'extra', width: 150 }
]

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

const loadStatus = async () => {
  loading.value = true
  try {
    dbStatus.value = await databaseApi.getStatus()
    if (dbStatus.value.configured) {
      await loadDatabases()
    }
  } catch (error) {
    console.error('Failed to load database status:', error)
  } finally {
    loading.value = false
  }
}

const handleTestConnection = async () => {
  testingConnection.value = true
  try {
    await databaseApi.testConnection()
    message.success('数据库连接成功')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '连接失败'
    message.error(msg)
  } finally {
    testingConnection.value = false
  }
}

const loadDatabases = async () => {
  loadingDatabases.value = true
  try {
    const { databases: dbs } = await databaseApi.listDatabases()
    databases.value = dbs
  } catch (error) {
    console.error('Failed to load databases:', error)
  } finally {
    loadingDatabases.value = false
  }
}

const handleDbSelect = (info: { key: string }) => {
  selectedDbKeys.value = [info.key]
  queryDatabase.value = info.key
  loadTables()
}

const loadTables = async () => {
  if (!selectedDatabase.value) return
  loadingTables.value = true
  try {
    const { tables: tbs } = await databaseApi.listTables(selectedDatabase.value)
    tables.value = tbs
  } catch (error) {
    console.error('Failed to load tables:', error)
  } finally {
    loadingTables.value = false
  }
}

const handleTableClick = async (record: TableInfo) => {
  viewingTable.value = record.name
  showColumnsModal.value = true
  loadingColumns.value = true
  try {
    const { columns } = await databaseApi.getTableColumns(selectedDatabase.value, record.name)
    tableColumnsData.value = columns
  } catch (error) {
    console.error('Failed to load columns:', error)
    message.error('获取表结构失败')
  } finally {
    loadingColumns.value = false
  }
}

const handleCreateDatabase = async () => {
  if (!newDbName.value.trim()) {
    message.warning('请输入数据库名称')
    return
  }
  creatingDb.value = true
  try {
    await databaseApi.createDatabase(newDbName.value.trim(), newDbCharset.value)
    showCreateDbModal.value = false
    newDbName.value = ''
    await loadDatabases()
  } catch (error) {
    console.error('Create database failed:', error)
  } finally {
    creatingDb.value = false
  }
}

const handleDropDatabase = async () => {
  if (!selectedDatabase.value) return
  try {
    await databaseApi.dropDatabase(selectedDatabase.value)
    selectedDbKeys.value = []
    tables.value = []
    await loadDatabases()
  } catch (error) {
    console.error('Drop database failed:', error)
  }
}

const handleExecuteQuery = async () => {
  if (!queryDatabase.value || !sqlContent.value.trim()) return
  executing.value = true
  queryError.value = ''
  queryResult.value = null
  try {
    const result = await databaseApi.executeQuery(queryDatabase.value, sqlContent.value.trim())
    // Add row index for table key
    result.rows = result.rows.map((row, idx) => ({ ...row, _rowIndex: idx }))
    queryResult.value = result
  } catch (error) {
    queryError.value = error instanceof Error ? error.message : '查询执行失败'
  } finally {
    executing.value = false
  }
}

const handleChangePassword = async () => {
  changingPassword.value = true
  try {
    await databaseApi.changePassword(
      passwordForm.currentUsername,
      passwordForm.currentPassword,
      passwordForm.newPassword
    )
    message.success('密码修改成功，请更新 .env 文件中的 DB_PASSWORD')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    const msg = error instanceof Error ? error.message : '密码修改失败'
    message.error(msg)
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  loadStatus()
})
</script>

<style scoped>
.database-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.database-manager :deep(.ant-spin-nested-loading),
.database-manager :deep(.ant-spin-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.db-header {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-hint {
  text-align: left;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  margin-top: 16px;
}

.config-hint pre {
  margin: 0;
  font-family: monospace;
  white-space: pre-wrap;
}

.db-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  min-height: 0;
  overflow: hidden;
}

.db-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.db-tabs :deep(.ant-tabs-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.db-tabs :deep(.ant-tabs-tabpane) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Overview layout */
.overview-layout {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.db-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-title {
  font-weight: 500;
  font-size: 13px;
}

.db-menu {
  flex: 1;
  overflow-y: auto;
  border-inline-end: none !important;
}

.db-menu :deep(.ant-menu-item) {
  display: flex;
  align-items: center;
}

.table-count {
  margin-left: auto;
}

.table-count :deep(.ant-badge-count) {
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  background: #e6f4ff;
  color: #1890ff;
  box-shadow: none;
}

.db-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.main-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
}

.db-name-display {
  font-weight: 500;
  font-size: 14px;
  color: #1890ff;
}

.tables-list {
  flex: 1;
  overflow: auto;
}

.tables-list :deep(.ant-table-row) {
  cursor: pointer;
}

/* SQL Query layout */
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
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  resize: none;
  border-radius: 6px;
  flex-shrink: 0;
}

.sql-editor:focus {
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
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

/* Account layout */
.account-layout {
  max-width: 700px;
}
</style>
