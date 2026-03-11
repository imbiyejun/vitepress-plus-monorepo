import type {
  SoftwareDefinition,
  SoftwareInfo,
  SoftwareTask,
  SoftwareTaskStep,
  SoftwareMessage,
  SoftwareAction,
  SoftwareConfigResult
} from '../types/server.js'
import { serverService } from './serverService.js'

type WebSocketBroadcast = (message: SoftwareMessage) => void

// Extensible software registry — add new entries here for future software support
const SOFTWARE_REGISTRY: SoftwareDefinition[] = [
  {
    id: 'nginx',
    name: 'Nginx',
    description: '高性能Web服务器和反向代理',
    icon: 'nginx',
    color: '#269539',
    category: 'webserver',
    checkCmd: 'nginx -v 2>&1',
    versionCmd: 'nginx -v 2>&1',
    installSteps: [
      { title: '更新软件源', cmd: 'apt-get update', timeout: 120000 },
      {
        title: '安装 Nginx',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get install -y nginx',
        timeout: 180000
      },
      { title: '启用开机自启', cmd: 'systemctl enable nginx' },
      { title: '启动服务', cmd: 'systemctl start nginx' }
    ],
    uninstallSteps: [
      { title: '停止服务', cmd: 'systemctl stop nginx' },
      { title: '禁用开机自启', cmd: 'systemctl disable nginx' },
      {
        title: '卸载 Nginx',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get remove -y nginx nginx-common nginx-core'
      },
      { title: '清理依赖', cmd: 'apt-get autoremove -y' }
    ],
    upgradeSteps: [
      { title: '更新软件源', cmd: 'apt-get update', timeout: 120000 },
      {
        title: '升级 Nginx',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get upgrade -y nginx',
        timeout: 180000
      },
      { title: '重启服务', cmd: 'systemctl restart nginx' }
    ],
    configPaths: ['/etc/nginx/nginx.conf', '/etc/nginx/sites-available/default'],
    serviceName: 'nginx'
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'JavaScript运行时环境',
    icon: 'nodejs',
    color: '#339933',
    category: 'runtime',
    checkCmd: 'node -v',
    versionCmd: 'node -v',
    installSteps: [
      {
        title: '下载 NodeSource 脚本',
        cmd: 'curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh',
        timeout: 60000
      },
      { title: '执行安装脚本', cmd: 'bash /tmp/nodesource_setup.sh', timeout: 120000 },
      {
        title: '安装 Node.js',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get install -y nodejs',
        timeout: 180000
      }
    ],
    uninstallSteps: [
      {
        title: '卸载 Node.js',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get remove -y nodejs'
      },
      {
        title: '清理 NodeSource 源',
        cmd: 'rm -f /etc/apt/sources.list.d/nodesource.list /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true'
      },
      { title: '清理依赖', cmd: 'apt-get autoremove -y' }
    ],
    upgradeSteps: [
      { title: '更新软件源', cmd: 'apt-get update', timeout: 120000 },
      {
        title: '升级 Node.js',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get upgrade -y nodejs',
        timeout: 180000
      }
    ],
    configPaths: [],
    serviceName: undefined
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: '关系型数据库管理系统',
    icon: 'mysql',
    color: '#4479A1',
    category: 'database',
    checkCmd: 'mysql --version 2>/dev/null',
    versionCmd: 'mysql --version 2>/dev/null',
    installSteps: [
      { title: '更新软件源', cmd: 'apt-get update', timeout: 120000 },
      {
        title: '安装 MySQL Server',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get install -y mysql-server',
        timeout: 300000
      },
      { title: '启用开机自启', cmd: 'systemctl enable mysql' },
      { title: '启动服务', cmd: 'systemctl start mysql' },
      {
        title: '设置 root 密码 (默认: root / root123456)',
        cmd: "mysql -e \"ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123456'; FLUSH PRIVILEGES;\" 2>/dev/null || true",
        timeout: 30000
      },
      {
        title: '验证 MySQL 连接',
        cmd: "mysql -u root -p'root123456' -e 'SELECT VERSION();' 2>/dev/null && echo '默认账号: root  默认密码: root123456  请在 .env 中添加 DB_USERNAME=root 和 DB_PASSWORD=root123456'",
        timeout: 10000
      }
    ],
    uninstallSteps: [
      { title: '停止服务', cmd: 'systemctl stop mysql' },
      { title: '禁用开机自启', cmd: 'systemctl disable mysql' },
      {
        title: '卸载 MySQL',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get remove -y mysql-server mysql-client mysql-common'
      },
      {
        title: '清理数据',
        cmd: 'apt-get autoremove -y && apt-get purge -y mysql-server mysql-client mysql-common'
      }
    ],
    upgradeSteps: [
      { title: '更新软件源', cmd: 'apt-get update', timeout: 120000 },
      {
        title: '升级 MySQL',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get upgrade -y mysql-server',
        timeout: 300000
      },
      { title: '重启服务', cmd: 'systemctl restart mysql' }
    ],
    configPaths: ['/etc/mysql/mysql.conf.d/mysqld.cnf', '/etc/mysql/my.cnf'],
    serviceName: 'mysql'
  },
  {
    id: 'pnpm',
    name: 'pnpm',
    description: '高效的Node.js包管理器',
    icon: 'pnpm',
    color: '#F69220',
    category: 'tool',
    checkCmd: 'pnpm -v',
    versionCmd: 'pnpm -v',
    installSteps: [{ title: '安装 pnpm', cmd: 'npm install -g pnpm', timeout: 120000 }],
    uninstallSteps: [{ title: '卸载 pnpm', cmd: 'npm uninstall -g pnpm' }],
    upgradeSteps: [{ title: '升级 pnpm', cmd: 'npm update -g pnpm', timeout: 120000 }],
    configPaths: [],
    serviceName: undefined
  },
  {
    id: 'pm2',
    name: 'PM2',
    description: 'Node.js进程管理工具',
    icon: 'pm2',
    color: '#2B037A',
    category: 'tool',
    checkCmd: 'pm2 -v',
    versionCmd: 'pm2 -v',
    installSteps: [
      { title: '安装 PM2', cmd: 'npm install -g pm2', timeout: 120000 },
      { title: '配置开机自启', cmd: 'pm2 startup 2>/dev/null || true' }
    ],
    uninstallSteps: [
      { title: '停止所有进程', cmd: 'pm2 kill 2>/dev/null || true' },
      { title: '卸载 PM2', cmd: 'npm uninstall -g pm2' }
    ],
    upgradeSteps: [{ title: '升级 PM2', cmd: 'npm update -g pm2', timeout: 120000 }],
    configPaths: [],
    serviceName: undefined
  },
  {
    id: 'git',
    name: 'Git',
    description: '分布式版本控制系统',
    icon: 'git',
    color: '#F05032',
    category: 'tool',
    checkCmd: 'git --version',
    versionCmd: 'git --version',
    installSteps: [
      {
        title: '安装 Git',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get install -y git',
        timeout: 120000
      }
    ],
    uninstallSteps: [
      { title: '卸载 Git', cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get remove -y git' },
      { title: '清理依赖', cmd: 'apt-get autoremove -y' }
    ],
    upgradeSteps: [
      { title: '更新软件源', cmd: 'apt-get update', timeout: 120000 },
      {
        title: '升级 Git',
        cmd: 'export DEBIAN_FRONTEND=noninteractive && apt-get upgrade -y git',
        timeout: 120000
      }
    ],
    configPaths: [],
    serviceName: undefined
  }
]

class SoftwareService {
  private currentTask: SoftwareTask | null = null
  private broadcast: WebSocketBroadcast | null = null

  setBroadcast(fn: WebSocketBroadcast): void {
    this.broadcast = fn
  }

  getRegistry(): SoftwareDefinition[] {
    return SOFTWARE_REGISTRY
  }

  getCurrentTask(): SoftwareTask | null {
    return this.currentTask
  }

  // Check status of all registered software
  async checkAllSoftware(): Promise<SoftwareInfo[]> {
    const results = await Promise.all(
      SOFTWARE_REGISTRY.map(async sw => {
        const { installed, version } = await this.checkSoftware(sw)
        return {
          id: sw.id,
          name: sw.name,
          description: sw.description,
          icon: sw.icon,
          color: sw.color,
          category: sw.category,
          installed,
          version,
          configPaths: sw.configPaths,
          serviceName: sw.serviceName
        }
      })
    )
    return results
  }

  private async checkSoftware(
    sw: SoftwareDefinition
  ): Promise<{ installed: boolean; version?: string }> {
    try {
      const result = await serverService.executeCommand(sw.checkCmd, 10000)
      if (!result.success) return { installed: false }

      const version = this.parseVersion(sw.id, result.output)
      return { installed: true, version }
    } catch {
      return { installed: false }
    }
  }

  private parseVersion(softwareId: string, output: string): string {
    const trimmed = output.trim()
    switch (softwareId) {
      case 'nginx': {
        const m = trimmed.match(/nginx\/(\S+)/)
        return m ? m[1] : trimmed
      }
      case 'nodejs':
        return trimmed.replace(/^v/, '')
      case 'mysql': {
        const m = trimmed.match(/Distrib\s+([\d.]+)/)
        return m ? m[1] : trimmed.split('\n')[0]
      }
      case 'git': {
        const m = trimmed.match(/git version\s+([\d.]+)/)
        return m ? m[1] : trimmed
      }
      default:
        return trimmed.split('\n')[0]
    }
  }

  // Execute a software action (install/uninstall/upgrade) as a background task
  async executeSoftwareAction(softwareId: string, action: SoftwareAction): Promise<string> {
    if (this.currentTask?.status === 'running') {
      throw new Error('Another software task is already running')
    }

    const sw = SOFTWARE_REGISTRY.find(s => s.id === softwareId)
    if (!sw) throw new Error(`Unknown software: ${softwareId}`)

    const stepDefs =
      action === 'install'
        ? sw.installSteps
        : action === 'uninstall'
          ? sw.uninstallSteps
          : sw.upgradeSteps

    const taskId = `sw-${softwareId}-${action}-${Date.now()}`
    const steps: SoftwareTaskStep[] = stepDefs.map(s => ({
      title: s.title,
      status: 'pending' as const,
      logs: []
    }))

    this.currentTask = {
      id: taskId,
      softwareId,
      softwareName: sw.name,
      action,
      status: 'running',
      steps,
      startTime: Date.now()
    }
    this.emitProgress()

    this.runSteps(sw, action, stepDefs).catch(err => {
      if (this.currentTask && this.currentTask.id === taskId) {
        this.currentTask.status = 'error'
        this.currentTask.error = err instanceof Error ? err.message : String(err)
        this.currentTask.endTime = Date.now()
        this.emitProgress()
      }
    })

    return taskId
  }

  private async runSteps(
    sw: SoftwareDefinition,
    action: SoftwareAction,
    stepDefs: SoftwareDefinition['installSteps']
  ): Promise<void> {
    const task = this.currentTask
    if (!task) return

    try {
      for (let i = 0; i < stepDefs.length; i++) {
        const stepDef = stepDefs[i]
        const step = task.steps[i]

        step.status = 'running'
        step.startTime = Date.now()
        this.emitProgress()

        try {
          step.logs.push(`[${this.timestamp()}] 执行: ${stepDef.title}`)
          this.emitProgress()

          const result = await serverService.executeCommand(stepDef.cmd, stepDef.timeout || 120000)

          const isAptCmd = stepDef.cmd.includes('apt-get') || stepDef.cmd.includes('apt ')
          const hasRealError =
            result.output.toLowerCase().includes('e: ') ||
            result.output.toLowerCase().includes('dpkg: error')

          if (!result.success && !(isAptCmd && !hasRealError && result.exitCode === 0)) {
            const errorMsg =
              result.output
                .split('\n')
                .filter(l => l.startsWith('E: ') || l.toLowerCase().includes('error'))
                .slice(0, 3)
                .join('\n') || `Exit code: ${result.exitCode}`
            step.logs.push(`[${this.timestamp()}] ✗ ${stepDef.title} 失败: ${errorMsg}`)
            step.status = 'error'
            step.endTime = Date.now()
            this.emitProgress()
            throw new Error(errorMsg)
          }

          step.logs.push(`[${this.timestamp()}] ✓ ${stepDef.title} 完成`)
          step.status = 'success'
          step.endTime = Date.now()
          this.emitProgress()
        } catch (err) {
          if (step.status !== 'error') {
            step.logs.push(
              `[${this.timestamp()}] ✗ ${err instanceof Error ? err.message : String(err)}`
            )
            step.status = 'error'
            step.endTime = Date.now()
            this.emitProgress()
          }
          throw err
        }
      }

      task.status = 'success'
      task.endTime = Date.now()
      this.emitProgress()
    } catch (err) {
      if (task.status !== 'error') {
        task.status = 'error'
        task.error = err instanceof Error ? err.message : String(err)
        task.endTime = Date.now()
        this.emitProgress()
      }
      throw err
    }
  }

  // Read software configuration file
  async getConfig(softwareId: string, configPath: string): Promise<SoftwareConfigResult> {
    const sw = SOFTWARE_REGISTRY.find(s => s.id === softwareId)
    if (!sw) throw new Error(`Unknown software: ${softwareId}`)
    if (!sw.configPaths.includes(configPath)) {
      throw new Error(`Invalid config path for ${sw.name}`)
    }

    const result = await serverService.executeCommand(`cat ${configPath} 2>/dev/null`, 10000)
    if (!result.success) {
      throw new Error(`Failed to read config: ${result.output}`)
    }
    return { softwareId, path: configPath, content: result.output }
  }

  // Write software configuration file
  async updateConfig(softwareId: string, configPath: string, content: string): Promise<void> {
    const sw = SOFTWARE_REGISTRY.find(s => s.id === softwareId)
    if (!sw) throw new Error(`Unknown software: ${softwareId}`)
    if (!sw.configPaths.includes(configPath)) {
      throw new Error(`Invalid config path for ${sw.name}`)
    }

    // Backup first
    await serverService.executeCommand(`cp ${configPath} ${configPath}.bak`, 10000)

    const escaped = content.replace(/'/g, "'\\''")
    const writeResult = await serverService.executeCommand(
      `cat > ${configPath} << 'VITEPRESS_EOF'\n${escaped}\nVITEPRESS_EOF`
    )
    if (!writeResult.success) {
      throw new Error(`Failed to write config: ${writeResult.output}`)
    }

    // Restart service if applicable
    if (sw.serviceName) {
      await serverService.executeCommand(`systemctl restart ${sw.serviceName}`, 30000)
    }
  }

  private timestamp(): string {
    return new Date().toLocaleTimeString()
  }

  private emitProgress(): void {
    if (!this.broadcast || !this.currentTask) return

    const messageType =
      this.currentTask.status === 'running'
        ? 'software:progress'
        : this.currentTask.status === 'success'
          ? 'software:complete'
          : 'software:error'

    this.broadcast({
      type: messageType,
      taskId: this.currentTask.id,
      task: this.currentTask
    })
  }
}

export const softwareService = new SoftwareService()
