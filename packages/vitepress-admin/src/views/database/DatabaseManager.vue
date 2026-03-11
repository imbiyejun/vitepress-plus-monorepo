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
        <div class="db-workspace">
          <!-- Left: Tree sidebar -->
          <div class="db-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title">数据库</span>
              <a-space size="small">
                <a-button size="small" @click="loadDatabases" :loading="loadingDatabases">
                  <template #icon><ReloadOutlined /></template>
                </a-button>
                <a-button size="small" type="primary" @click="showCreateDbModal = true">
                  <template #icon><PlusOutlined /></template>
                </a-button>
              </a-space>
            </div>
            <div class="tree-wrap">
              <a-tree
                v-if="treeData.length > 0"
                :tree-data="treeData"
                :load-data="onLoadTreeData"
                :selectedKeys="selectedTreeKeys"
                :expandedKeys="expandedKeys"
                block-node
                show-icon
                @select="onTreeSelect"
                @expand="onTreeExpand"
              >
                <template #icon="{ dataRef }">
                  <DatabaseOutlined v-if="dataRef.type === 'database'" />
                  <TableOutlined v-else-if="dataRef.type === 'table'" />
                </template>
                <template #title="{ dataRef }">
                  <div class="tree-node-title">
                    <span class="tree-node-name">{{ dataRef.title }}</span>
                    <a-badge
                      v-if="dataRef.type === 'database' && dataRef.tableCount != null"
                      :count="dataRef.tableCount"
                      :overflow-count="999"
                      class="tree-badge"
                    />
                    <a-dropdown v-if="dataRef.type === 'database'" :trigger="['click']" @click.stop>
                      <span class="tree-node-action" @click.stop>
                        <EllipsisOutlined />
                      </span>
                      <template #overlay>
                        <a-menu>
                          <a-menu-item
                            key="create-table"
                            @click="openCreateTableModal(dataRef.key as string)"
                          >
                            <PlusOutlined /> 新建表
                          </a-menu-item>
                          <a-menu-item key="new-query" @click="openQueryTab(dataRef.key as string)">
                            <CodeOutlined /> 新建查询
                          </a-menu-item>
                          <a-menu-divider />
                          <a-menu-item
                            key="drop"
                            danger
                            @click="handleDropDatabase(dataRef.key as string)"
                          >
                            <DeleteOutlined /> 删除数据库
                          </a-menu-item>
                        </a-menu>
                      </template>
                    </a-dropdown>
                  </div>
                </template>
              </a-tree>
              <a-empty v-else-if="!loadingDatabases" description="暂无数据库" />
            </div>
          </div>

          <!-- Right: Content area with tabs -->
          <div class="db-content">
            <a-tabs
              v-model:activeKey="activeTab"
              class="content-tabs"
              type="editable-card"
              @edit="onTabEdit"
            >
              <!-- Dynamic tabs: table viewers + SQL queries -->
              <a-tab-pane v-for="tab in openTabs" :key="tab.key" :closable="tab.closable !== false">
                <template #tab>
                  <span>
                    <TableOutlined v-if="tab.type === 'table'" />
                    <CodeOutlined v-else-if="tab.type === 'query'" />
                    <SettingOutlined v-else-if="tab.type === 'account'" />
                    {{ tab.title }}
                  </span>
                </template>

                <TableDataViewer
                  v-if="tab.type === 'table'"
                  :database="tab.database"
                  :table="tab.tableName!"
                />

                <SqlQueryTab
                  v-else-if="tab.type === 'query'"
                  :databaseOptions="databaseOptions"
                  :initialDatabase="tab.database"
                />

                <div v-else-if="tab.type === 'account'" class="account-layout">
                  <a-card title="当前连接信息" size="small" style="margin-bottom: 16px">
                    <a-descriptions :column="2" size="small">
                      <a-descriptions-item label="主机">{{ dbStatus.host }}</a-descriptions-item>
                      <a-descriptions-item label="端口">{{ dbStatus.port }}</a-descriptions-item>
                      <a-descriptions-item label="用户名">{{
                        dbStatus.username
                      }}</a-descriptions-item>
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
          </div>
        </div>
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

    <!-- Create Table Modal -->
    <a-modal
      v-model:open="showCreateTableModal"
      title="新建表"
      width="860px"
      @ok="handleCreateTable"
      :confirmLoading="creatingTable"
      okText="创建"
      destroyOnClose
    >
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 19 }" style="margin-bottom: 16px">
        <a-form-item label="目标数据库">
          <a-tag color="blue">{{ createTableDatabase }}</a-tag>
        </a-form-item>
        <a-form-item label="表名" required>
          <a-input v-model:value="newTableName" placeholder="table_name" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="引擎" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
              <a-select v-model:value="newTableEngine" style="width: 100%">
                <a-select-option value="InnoDB">InnoDB</a-select-option>
                <a-select-option value="MyISAM">MyISAM</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="字符集" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }">
              <a-select v-model:value="newTableCharset" style="width: 100%">
                <a-select-option value="utf8mb4">utf8mb4</a-select-option>
                <a-select-option value="utf8">utf8</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="备注" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
              <a-input v-model:value="newTableComment" placeholder="可选" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <div class="create-table-columns">
        <div class="columns-header">
          <span>列定义</span>
          <a-button size="small" type="primary" @click="addColumn">
            <template #icon><PlusOutlined /></template>
            添加列
          </a-button>
        </div>
        <a-table
          :dataSource="newTableColumns"
          :columns="createTableColumnDefs"
          :pagination="false"
          size="small"
          bordered
          rowKey="_idx"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'name'">
              <a-input v-model:value="record.name" size="small" placeholder="列名" />
            </template>
            <template v-else-if="column.key === 'type'">
              <a-auto-complete
                v-model:value="record.type"
                size="small"
                :options="mysqlTypes"
                placeholder="INT"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'length'">
              <a-input v-model:value="record.length" size="small" placeholder="长度" />
            </template>
            <template v-else-if="column.key === 'nullable'">
              <a-checkbox v-model:checked="record.nullable" />
            </template>
            <template v-else-if="column.key === 'primaryKey'">
              <a-checkbox v-model:checked="record.primaryKey" />
            </template>
            <template v-else-if="column.key === 'autoIncrement'">
              <a-checkbox v-model:checked="record.autoIncrement" />
            </template>
            <template v-else-if="column.key === 'defaultValue'">
              <a-input v-model:value="record.defaultValue" size="small" placeholder="默认值" />
            </template>
            <template v-else-if="column.key === 'comment'">
              <a-input v-model:value="record.comment" size="small" placeholder="备注" />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button
                size="small"
                type="link"
                danger
                :disabled="newTableColumns.length <= 1"
                @click="removeColumn(index)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </template>
          </template>
        </a-table>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import type { TreeProps } from 'ant-design-vue'
import {
  ApiOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  TableOutlined,
  CodeOutlined,
  SettingOutlined,
  EllipsisOutlined
} from '@ant-design/icons-vue'
import {
  databaseApi,
  type DatabaseStatus as DbStatus,
  type DatabaseInfo,
  type CreateTableColumn
} from '@/services/api'
import TableDataViewer from './TableDataViewer.vue'
import SqlQueryTab from './SqlQueryTab.vue'

interface TreeNode {
  key: string
  title: string
  type: 'database' | 'table'
  isLeaf?: boolean
  children?: TreeNode[]
  tableCount?: number
}

interface TabItem {
  key: string
  title: string
  type: 'table' | 'query' | 'account'
  database: string
  tableName?: string
  closable?: boolean
}

interface NewColumnRow extends CreateTableColumn {
  _idx: number
}

const loading = ref(false)
const testingConnection = ref(false)
const dbStatus = ref<DbStatus>({ configured: false })

// Tree state
const databases = ref<DatabaseInfo[]>([])
const loadingDatabases = ref(false)
const treeData = ref<TreeNode[]>([])
const selectedTreeKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

// Tabs state
let queryTabCounter = 0
const activeTab = ref('__query_0')
const openTabs = ref<TabItem[]>([
  { key: '__query_0', title: 'SQL 查询', type: 'query', database: '', closable: false },
  { key: '__account', title: '账号管理', type: 'account', database: '', closable: false }
])

// Create database
const showCreateDbModal = ref(false)
const newDbName = ref('')
const newDbCharset = ref('utf8mb4')
const creatingDb = ref(false)

// Create table
const showCreateTableModal = ref(false)
const createTableDatabase = ref('')
const newTableName = ref('')
const newTableEngine = ref('InnoDB')
const newTableCharset = ref('utf8mb4')
const newTableComment = ref('')
const creatingTable = ref(false)
let columnIdxCounter = 0
const newTableColumns = ref<NewColumnRow[]>([makeDefaultColumn()])

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

const databaseOptions = computed(() => databases.value.map(d => ({ value: d.name, label: d.name })))

const mysqlTypes = [
  'INT',
  'BIGINT',
  'TINYINT',
  'SMALLINT',
  'MEDIUMINT',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'MEDIUMTEXT',
  'LONGTEXT',
  'DECIMAL',
  'FLOAT',
  'DOUBLE',
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'TIME',
  'YEAR',
  'BLOB',
  'MEDIUMBLOB',
  'LONGBLOB',
  'JSON',
  'ENUM',
  'SET',
  'BOOLEAN'
].map(t => ({ value: t }))

const createTableColumnDefs = [
  { title: '列名', key: 'name', width: 130 },
  { title: '类型', key: 'type', width: 120 },
  { title: '长度', key: 'length', width: 70 },
  { title: '可空', key: 'nullable', width: 50, align: 'center' as const },
  { title: '主键', key: 'primaryKey', width: 50, align: 'center' as const },
  { title: '自增', key: 'autoIncrement', width: 50, align: 'center' as const },
  { title: '默认值', key: 'defaultValue', width: 100 },
  { title: '备注', key: 'comment', width: 120 },
  { title: '', key: 'actions', width: 50 }
]

function makeDefaultColumn(): NewColumnRow {
  return {
    _idx: columnIdxCounter++,
    name: '',
    type: 'VARCHAR',
    length: '255',
    nullable: true,
    primaryKey: false,
    autoIncrement: false,
    defaultValue: '',
    comment: ''
  }
}

function addColumn() {
  newTableColumns.value.push(makeDefaultColumn())
}

function removeColumn(index: number) {
  newTableColumns.value.splice(index, 1)
}

// Build tree from databases list
function buildTree(dbs: DatabaseInfo[]): TreeNode[] {
  return dbs.map(db => ({
    key: db.name,
    title: db.name,
    type: 'database' as const,
    isLeaf: false,
    tableCount: db.tables,
    children: undefined
  }))
}

// Lazy load tables when expanding a database node
const onLoadTreeData: TreeProps['loadData'] = async treeNode => {
  const node = treeNode.dataRef as unknown as TreeNode
  if (node.children) return
  try {
    const { tables } = await databaseApi.listTables(node.key)
    node.children = tables.map(t => ({
      key: `${node.key}::${t.name}`,
      title: t.name,
      type: 'table' as const,
      isLeaf: true
    }))
    treeData.value = [...treeData.value]
  } catch {
    message.error('加载表列表失败')
  }
}

function onTreeExpand(keys: string[]) {
  expandedKeys.value = keys
}

function onTreeSelect(keys: string[], info: { node: { dataRef: unknown } }) {
  selectedTreeKeys.value = keys as string[]
  const node = info.node.dataRef as unknown as TreeNode
  if (node.type === 'table') {
    const [database, tableName] = node.key.split('::')
    openTableTab(database, tableName)
  } else if (node.type === 'database') {
    if (!expandedKeys.value.includes(node.key)) {
      expandedKeys.value = [...expandedKeys.value, node.key]
    }
  }
}

function openTableTab(database: string, tableName: string) {
  const tabKey = `table::${database}::${tableName}`
  const existing = openTabs.value.find(t => t.key === tabKey)
  if (existing) {
    activeTab.value = tabKey
    return
  }
  // Insert before fixed tabs
  const fixedIdx = openTabs.value.findIndex(t => t.closable === false)
  const insertIdx = fixedIdx >= 0 ? fixedIdx : openTabs.value.length
  openTabs.value.splice(insertIdx, 0, {
    key: tabKey,
    title: tableName,
    type: 'table',
    database,
    tableName
  })
  activeTab.value = tabKey
}

function openQueryTab(database?: string) {
  queryTabCounter++
  const tabKey = `__query_${queryTabCounter}`
  const fixedIdx = openTabs.value.findIndex(t => t.closable === false)
  const insertIdx = fixedIdx >= 0 ? fixedIdx : openTabs.value.length
  openTabs.value.splice(insertIdx, 0, {
    key: tabKey,
    title: `SQL 查询 ${queryTabCounter}`,
    type: 'query',
    database: database || ''
  })
  activeTab.value = tabKey
}

function onTabEdit(targetKey: string | MouseEvent, action: string) {
  if (action === 'add') {
    openQueryTab()
  } else if (action === 'remove' && typeof targetKey === 'string') {
    const tab = openTabs.value.find(t => t.key === targetKey)
    if (tab && tab.closable === false) return
    const idx = openTabs.value.findIndex(t => t.key === targetKey)
    if (idx !== -1) {
      openTabs.value.splice(idx, 1)
      if (activeTab.value === targetKey) {
        const prev = openTabs.value[Math.max(0, idx - 1)]
        activeTab.value = prev ? prev.key : openTabs.value[0]?.key || ''
      }
    }
  }
}

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

// Reload tree and restore previously expanded nodes
const loadDatabases = async () => {
  loadingDatabases.value = true
  const prevExpanded = [...expandedKeys.value]
  try {
    const { databases: dbs } = await databaseApi.listDatabases()
    databases.value = dbs
    const tree = buildTree(dbs)

    // Re-load tables for previously expanded databases
    await Promise.all(
      prevExpanded.map(async key => {
        const node = tree.find(n => n.key === key)
        if (!node) return
        try {
          const { tables } = await databaseApi.listTables(key)
          node.children = tables.map(t => ({
            key: `${key}::${t.name}`,
            title: t.name,
            type: 'table' as const,
            isLeaf: true
          }))
          node.tableCount = tables.length
        } catch {
          /* ignore individual failures */
        }
      })
    )

    treeData.value = tree
    expandedKeys.value = prevExpanded.filter(k => tree.some(n => n.key === k))
  } catch (error) {
    console.error('Failed to load databases:', error)
  } finally {
    loadingDatabases.value = false
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

const handleDropDatabase = (dbName: string) => {
  Modal.confirm({
    title: '删除数据库',
    content: `确定删除数据库 "${dbName}"？此操作不可撤销！`,
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await databaseApi.dropDatabase(dbName)
        openTabs.value = openTabs.value.filter(t => t.closable === false || t.database !== dbName)
        await loadDatabases()
      } catch (error) {
        console.error('Drop database failed:', error)
      }
    }
  })
}

function openCreateTableModal(database: string) {
  createTableDatabase.value = database
  newTableName.value = ''
  newTableEngine.value = 'InnoDB'
  newTableCharset.value = 'utf8mb4'
  newTableComment.value = ''
  columnIdxCounter = 0
  newTableColumns.value = [
    {
      _idx: columnIdxCounter++,
      name: 'id',
      type: 'INT',
      length: '',
      nullable: false,
      primaryKey: true,
      autoIncrement: true,
      defaultValue: '',
      comment: '主键'
    },
    makeDefaultColumn()
  ]
  showCreateTableModal.value = true
}

const handleCreateTable = async () => {
  if (!newTableName.value.trim()) {
    message.warning('请输入表名')
    return
  }
  const validColumns = newTableColumns.value.filter(c => c.name.trim() && c.type.trim())
  if (validColumns.length === 0) {
    message.warning('请至少添加一个有效的列')
    return
  }
  creatingTable.value = true
  try {
    await databaseApi.createTable(
      createTableDatabase.value,
      newTableName.value.trim(),
      validColumns.map(({ _idx, ...col }) => col),
      newTableEngine.value,
      newTableCharset.value,
      newTableComment.value
    )
    showCreateTableModal.value = false
    // Reload the database tree to reflect the new table
    const node = treeData.value.find(n => n.key === createTableDatabase.value)
    if (node) {
      node.children = undefined
      if (expandedKeys.value.includes(createTableDatabase.value)) {
        try {
          const { tables } = await databaseApi.listTables(createTableDatabase.value)
          node.children = tables.map(t => ({
            key: `${createTableDatabase.value}::${t.name}`,
            title: t.name,
            type: 'table' as const,
            isLeaf: true
          }))
          node.tableCount = tables.length
          treeData.value = [...treeData.value]
        } catch {
          /* ignore */
        }
      }
    }
    message.success('表创建成功')
  } catch (error) {
    const msg = error instanceof Error ? error.message : '创建表失败'
    message.error(msg)
  } finally {
    creatingTable.value = false
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

/* Workspace */
.db-workspace {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
}

/* Sidebar */
.db-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.sidebar-title {
  font-weight: 500;
  font-size: 13px;
}

.tree-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.tree-wrap :deep(.ant-tree) {
  background: transparent;
}

.tree-wrap :deep(.ant-tree-node-content-wrapper) {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.tree-node-title {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.tree-node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-badge :deep(.ant-badge-count) {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  background: #e6f4ff;
  color: #1890ff;
  box-shadow: none;
}

.tree-node-action {
  margin-left: auto;
  padding: 0 4px;
  cursor: pointer;
  color: #999;
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-wrap :deep(.ant-tree-treenode:hover) .tree-node-action {
  opacity: 1;
}

.tree-node-action:hover {
  color: #1890ff;
}

/* Right content */
.db-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
}

.content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 12px;
}

.content-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-tabs :deep(.ant-tabs-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-tabs :deep(.ant-tabs-tabpane) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Account layout */
.account-layout {
  max-width: 700px;
  overflow-y: auto;
}

/* Create table modal */
.create-table-columns {
  margin-top: 8px;
}

.columns-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}

.create-table-columns :deep(.ant-table-cell) {
  padding: 4px 6px !important;
}

.create-table-columns :deep(.ant-input),
.create-table-columns :deep(.ant-select) {
  font-size: 12px;
}
</style>
