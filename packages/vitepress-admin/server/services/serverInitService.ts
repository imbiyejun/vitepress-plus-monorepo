import type {
  ServerInitConfig,
  InitStep,
  InitTask,
  InitMessage,
  ServerEnvStatus
} from '../types/server.js'
import { serverService } from './serverService.js'

type WebSocketBroadcast = (message: InitMessage) => void

// Deploy config from environment variables
interface DeployEnvConfig {
  host: string
  domain?: string
  remotePath?: string
}

class ServerInitService {
  private currentTask: InitTask | null = null
  private broadcast: WebSocketBroadcast | null = null

  setBroadcast(fn: WebSocketBroadcast): void {
    this.broadcast = fn
  }

  getCurrentTask(): InitTask | null {
    return this.currentTask
  }

  // Get deploy config from environment
  getDeployEnvConfig(): DeployEnvConfig | null {
    const host = process.env.DEPLOY_HOST
    if (!host) return null

    return {
      host,
      domain: process.env.DEPLOY_DOMAIN || undefined,
      remotePath: process.env.DEPLOY_REMOTE_PATH || undefined
    }
  }

  // Check current server environment status
  async checkEnvironment(): Promise<ServerEnvStatus> {
    const checks = await Promise.all([
      this.checkCommand('nginx -v 2>&1'),
      this.checkCommand('node -v'),
      this.checkCommand('pnpm -v'),
      this.checkCommand('git --version'),
      this.checkCommand('pm2 -v')
    ])

    const [nginx, node, pnpm, git, pm2] = checks
    const envConfig = this.getDeployEnvConfig()

    return {
      hasNginx: nginx.success,
      hasNode: node.success,
      hasPnpm: pnpm.success,
      hasGit: git.success,
      hasPm2: pm2.success,
      nodeVersion: node.success ? node.output.trim() : undefined,
      nginxVersion: nginx.success ? this.parseNginxVersion(nginx.output) : undefined,
      domain: envConfig?.domain,
      serverIp: envConfig?.host,
      remotePath: envConfig?.remotePath
    }
  }

  private parseNginxVersion(output: string): string {
    const match = output.match(/nginx\/(\S+)/)
    return match ? match[1] : output.trim()
  }

  private async checkCommand(cmd: string): Promise<{ success: boolean; output: string }> {
    try {
      const result = await serverService.executeCommand(cmd, 10000)
      return { success: result.success, output: result.output }
    } catch {
      return { success: false, output: '' }
    }
  }

  // Start initialization task
  async startInit(config: ServerInitConfig): Promise<string> {
    if (this.currentTask?.status === 'running') {
      throw new Error('Another initialization task is running')
    }

    // Merge with environment config
    const envConfig = this.getDeployEnvConfig()
    const mergedConfig: ServerInitConfig = {
      ...config,
      // Use env domain if not provided, fallback to server IP
      domain: config.domain || envConfig?.domain || undefined,
      // Use env remote path as webRoot if not provided
      webRoot: config.webRoot || envConfig?.remotePath || '/var/www/vitepress',
      // Store server IP for nginx config when no domain
      serverIp: envConfig?.host
    }

    const taskId = `init-${Date.now()}`
    const steps: InitStep[] = [
      { id: 'update', title: '更新系统软件包', status: 'pending' },
      { id: 'nginx', title: '安装并配置 Nginx', status: 'pending' },
      { id: 'node', title: '安装 Node.js', status: 'pending' },
      { id: 'pnpm', title: '安装 pnpm', status: 'pending' },
      { id: 'pm2', title: '安装 PM2', status: 'pending' },
      { id: 'git', title: '安装 Git', status: 'pending' },
      { id: 'webroot', title: '创建网站目录', status: 'pending' },
      { id: 'nginx-config', title: '配置 Nginx 站点', status: 'pending' }
    ]

    if (mergedConfig.enableSsl && mergedConfig.domain) {
      steps.push({ id: 'ssl', title: '配置 SSL 证书', status: 'pending' })
    }

    this.currentTask = {
      id: taskId,
      status: 'running',
      steps,
      config: mergedConfig,
      startTime: Date.now()
    }

    this.emitProgress()
    this.runInit(mergedConfig).catch(err => {
      if (this.currentTask) {
        this.currentTask.status = 'error'
        this.currentTask.error = err.message
        this.currentTask.endTime = Date.now()
        this.emitProgress()
      }
    })

    return taskId
  }

  private async runInit(config: ServerInitConfig): Promise<void> {
    try {
      await this.runStep('update', async () => {
        this.logToStep('正在更新软件包列表...')
        await this.execAptUpdate()
        this.logToStep('正在升级已安装的软件包（可能需要几分钟）...')
        await this.execAptUpgrade()
        return '系统软件包更新完成'
      })

      await this.runStep('nginx', async () => {
        this.logToStep('检查 Nginx 是否已安装...')
        const status = await this.checkCommand('nginx -v 2>&1')
        if (status.success) {
          this.logToStep(`Nginx 已安装: ${this.parseNginxVersion(status.output)}`)
          return `Nginx ${this.parseNginxVersion(status.output)} 已安装`
        }
        this.logToStep('Nginx 未安装，开始安装...')
        await this.execWithRetry('apt-get install -y nginx', '安装 Nginx')
        this.logToStep('设置 Nginx 开机自启...')
        await this.execWithLog('systemctl enable nginx', '启用 Nginx 服务')
        await this.execWithLog('systemctl start nginx', '启动 Nginx')
        return 'Nginx 安装完成'
      })

      await this.runStep('node', async () => {
        this.logToStep('检查 Node.js 是否已安装...')
        const status = await this.checkCommand('node -v')
        if (status.success) {
          this.logToStep(`Node.js 已安装: ${status.output.trim()}`)
          return `Node.js ${status.output.trim()} 已安装`
        }
        const nodeVersion = config.nodeVersion || '20'
        this.logToStep(`准备安装 Node.js ${nodeVersion}.x ...`)

        // Clean up old NodeSource configuration
        this.logToStep('清理旧的 NodeSource 配置...')
        await serverService.executeCommand(
          'rm -f /etc/apt/sources.list.d/nodesource.list /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true',
          10000
        )

        // Install Node.js using NodeSource
        this.logToStep('下载 NodeSource 安装脚本...(这可能需要几分钟)')
        const setupResult = await serverService.executeCommand(
          `curl -fsSL https://deb.nodesource.com/setup_${nodeVersion}.x -o /tmp/nodesource_setup.sh && bash /tmp/nodesource_setup.sh`,
          180000
        )

        if (!setupResult.success) {
          // Fallback: try installing from default repos or snap
          this.logToStep('NodeSource 配置失败，尝试使用 snap 安装...')
          await this.execWithRetry('apt-get install -y snapd', '安装 snapd')
          await this.execWithRetry(
            `snap install node --classic --channel=${nodeVersion}`,
            '使用 snap 安装 Node.js'
          )
        } else {
          this.logToStep('正在安装 Node.js...(这可能需要几分钟)')
          await this.execWithRetry('apt-get install -y nodejs', '安装 Node.js')
        }

        const newVersion = await this.checkCommand('node -v')
        if (!newVersion.success) {
          throw new Error('Node.js 安装失败，请检查服务器网络连接')
        }
        this.logToStep(`Node.js 安装完成: ${newVersion.output.trim()}`)
        return `Node.js ${newVersion.output.trim()} 安装完成`
      })

      await this.runStep('pnpm', async () => {
        this.logToStep('检查 pnpm 是否已安装...')
        const status = await this.checkCommand('pnpm -v')
        if (status.success) {
          this.logToStep(`pnpm 已安装: ${status.output.trim()}`)
          return `pnpm ${status.output.trim()} 已安装`
        }
        this.logToStep('正在安装 pnpm...')
        await this.execWithLog('npm install -g pnpm', '安装 pnpm')
        const newVersion = await this.checkCommand('pnpm -v')
        return `pnpm ${newVersion.output.trim()} 安装完成`
      })

      await this.runStep('pm2', async () => {
        this.logToStep('检查 PM2 是否已安装...')
        const status = await this.checkCommand('pm2 -v')
        if (status.success) {
          this.logToStep(`PM2 已安装: ${status.output.trim()}`)
          return `PM2 ${status.output.trim()} 已安装`
        }
        this.logToStep('正在安装 PM2...')
        await this.execWithLog('npm install -g pm2', '安装 PM2')
        this.logToStep('配置 PM2 开机自启...')
        await this.execWithLog('pm2 startup', '配置 PM2 自启')
        const newVersion = await this.checkCommand('pm2 -v')
        return `PM2 ${newVersion.output.trim()} 安装完成`
      })

      await this.runStep('git', async () => {
        this.logToStep('检查 Git 是否已安装...')
        const status = await this.checkCommand('git --version')
        if (status.success) {
          this.logToStep(`Git 已安装: ${status.output.trim()}`)
          return status.output.trim()
        }
        this.logToStep('正在安装 Git...')
        await this.execWithRetry('apt-get install -y git', '安装 Git')
        const newVersion = await this.checkCommand('git --version')
        return newVersion.output.trim()
      })

      const webRoot = config.webRoot || '/var/www/vitepress'
      await this.runStep('webroot', async () => {
        this.logToStep(`创建网站目录: ${webRoot}`)
        await this.execWithLog(`mkdir -p ${webRoot}`, '创建目录')

        // Create a default welcome page
        this.logToStep('创建默认欢迎页面...')
        const welcomeHtml = this.generateWelcomePage(config)
        await this.writeRemoteFile(`${webRoot}/index.html`, welcomeHtml)

        this.logToStep('设置目录权限...')
        await this.execWithLog(`chown -R www-data:www-data ${webRoot}`, '设置所有者')
        await this.execWithLog(`chmod -R 755 ${webRoot}`, '设置权限')
        return `目录 ${webRoot} 创建完成`
      })

      await this.runStep('nginx-config', async () => {
        this.logToStep('生成 Nginx 配置文件...')
        const nginxConfig = this.generateNginxConfig(config, webRoot)
        const configPath = `/etc/nginx/sites-available/vitepress`
        const enabledPath = `/etc/nginx/sites-enabled/vitepress`

        this.logToStep(`写入配置到 ${configPath}`)
        await this.writeRemoteFile(configPath, nginxConfig)

        this.logToStep('启用站点配置...')
        await this.execWithLog(`ln -sf ${configPath} ${enabledPath}`, '创建符号链接')
        await this.execWithLog('rm -f /etc/nginx/sites-enabled/default', '移除默认站点')

        this.logToStep('测试 Nginx 配置...')
        const testResult = await serverService.executeCommand('nginx -t')
        if (!testResult.success) {
          throw new Error(`Nginx 配置测试失败: ${testResult.output}`)
        }
        this.logToStep('Nginx 配置测试通过')

        await this.execWithLog('systemctl reload nginx', '重载 Nginx')
        const accessInfo = config.domain || config.serverIp || 'IP'
        return `Nginx 配置完成，访问: http://${accessInfo}`
      })

      if (config.enableSsl && config.domain) {
        await this.runStep('ssl', async () => {
          if (config.sslCertPath && config.sslKeyPath) {
            this.logToStep('检查自定义 SSL 证书...')
            const checkCert = await serverService.executeCommand(
              `test -f ${config.sslCertPath} && test -f ${config.sslKeyPath} && echo "ok"`
            )
            if (!checkCert.output.includes('ok')) {
              throw new Error('SSL 证书文件不存在')
            }
            this.logToStep('SSL 证书文件验证通过')
          } else {
            this.logToStep('检查 Certbot 是否已安装...')
            const certbotStatus = await this.checkCommand('certbot --version')
            if (!certbotStatus.success) {
              this.logToStep('安装 Certbot...')
              await this.execWithRetry(
                'apt-get install -y certbot python3-certbot-nginx',
                '安装 Certbot'
              )
            }
            this.logToStep(`申请 Let's Encrypt 证书: ${config.domain}`)
            this.logToStep('这可能需要几分钟，请耐心等待...')
            await this.execWithLog(
              `certbot --nginx -d ${config.domain} --non-interactive --agree-tos -m admin@${config.domain}`,
              '申请 SSL 证书',
              180000
            )
          }

          this.logToStep('更新 Nginx SSL 配置...')
          const sslConfig = this.generateNginxSslConfig(
            config,
            config.webRoot || '/var/www/vitepress'
          )
          await this.writeRemoteFile('/etc/nginx/sites-available/vitepress', sslConfig)
          await this.execWithLog('systemctl reload nginx', '重载 Nginx')
          return `SSL 配置完成，访问: https://${config.domain}`
        })
      }

      if (this.currentTask) {
        this.currentTask.status = 'success'
        this.currentTask.endTime = Date.now()
        this.emitProgress()
      }
    } catch (err) {
      if (this.currentTask) {
        this.currentTask.status = 'error'
        this.currentTask.error = err instanceof Error ? err.message : String(err)
        this.currentTask.endTime = Date.now()
        this.emitProgress()
      }
      throw err
    }
  }

  private async runStep(stepId: string, action: () => Promise<string | void>): Promise<void> {
    const step = this.currentTask?.steps.find(s => s.id === stepId)
    if (!step) return

    step.status = 'running'
    step.startTime = Date.now()
    step.logs = []
    this.emitProgress()

    try {
      const result = await action()
      step.status = 'success'
      step.message = result || 'Completed'
      step.endTime = Date.now()
      this.emitProgress()
    } catch (err) {
      step.status = 'error'
      step.message = err instanceof Error ? err.message : String(err)
      step.endTime = Date.now()
      this.emitProgress()
      throw err
    }
  }

  // Log message to current running step
  private logToStep(message: string): void {
    if (!this.currentTask) return
    const runningStep = this.currentTask.steps.find(s => s.status === 'running')
    if (runningStep) {
      if (!runningStep.logs) runningStep.logs = []
      runningStep.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`)
      this.emitProgress()
    }
  }

  private async execWithLog(cmd: string, description: string, timeout = 300000): Promise<string> {
    this.logToStep(`执行: ${description}`)
    try {
      const result = await serverService.executeCommand(cmd, timeout)

      // apt-get commands output progress to stderr, check for real errors
      const isAptCommand = cmd.includes('apt-get') || cmd.includes('apt ')
      const hasRealError =
        result.output.toLowerCase().includes('error:') ||
        result.output.toLowerCase().includes('e: ') ||
        result.output.toLowerCase().includes('failed')

      // Consider success if exit code is 0, or for apt commands if no real error found
      if (result.success || (isAptCommand && !hasRealError && result.exitCode === 0)) {
        this.logToStep(`✓ ${description} 完成`)
        return result.output
      }

      // Extract meaningful error message
      const lines = result.output.split('\n').filter(l => l.trim())
      const errorLines = lines.filter(
        l =>
          l.toLowerCase().includes('error') ||
          l.toLowerCase().includes('failed') ||
          l.startsWith('E: ')
      )
      const errorMsg =
        errorLines.length > 0 ? errorLines.slice(0, 3).join('\n') : `Exit code: ${result.exitCode}`

      this.logToStep(`✗ ${description} 失败: ${errorMsg}`)
      throw new Error(errorMsg)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      if (!errMsg.includes('Exit code:')) {
        this.logToStep(`✗ ${description} 错误: ${errMsg}`)
      }
      throw err
    }
  }

  private async execWithRetry(cmd: string, description: string, maxRetries = 2): Promise<string> {
    let lastError: Error | null = null
    for (let i = 0; i <= maxRetries; i++) {
      if (i > 0) {
        this.logToStep(`重试 ${i}/${maxRetries}...`)
        await this.sleep(3000)
      }
      try {
        return await this.execWithLog(cmd, description, 300000)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        // For apt lock errors, wait longer
        if (
          lastError.message.includes('lock') ||
          lastError.message.includes('Could not get lock')
        ) {
          this.logToStep('等待软件包锁释放...')
          await this.sleep(10000)
        }
      }
    }
    throw lastError
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Special handling for apt-get update - it outputs to stderr and may have warnings
  private async execAptUpdate(): Promise<void> {
    // First, clean up any problematic third-party sources
    this.logToStep('清理可能有问题的第三方软件源...')
    await serverService.executeCommand(
      'rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true',
      10000
    )

    this.logToStep('执行: apt-get update')
    const result = await serverService.executeCommand(
      'export DEBIAN_FRONTEND=noninteractive && apt-get update 2>&1',
      120000
    )

    const lines = result.output.split('\n')

    // Count successful operations
    const hitCount = lines.filter(l => l.startsWith('Hit:')).length
    const getCount = lines.filter(l => l.startsWith('Get:')).length

    // Check for critical errors (not just third-party source failures)
    const criticalErrors = lines.filter(
      l =>
        (l.startsWith('E: ') && !l.includes('nodesource') && !l.includes('Some index files')) ||
        l.includes('Could not resolve') ||
        l.includes('Temporary failure')
    )

    // If we have some successful hits/gets, consider it a success even with some failures
    if (criticalErrors.length > 0 && hitCount === 0 && getCount === 0) {
      const errorMsg = criticalErrors.slice(0, 3).join('\n')
      this.logToStep(`✗ apt-get update 失败: ${errorMsg}`)
      throw new Error(errorMsg)
    }

    // Log warnings for non-critical failures
    const warnings = lines.filter(l => l.startsWith('Err:') || l.includes('Failed to fetch'))
    if (warnings.length > 0) {
      this.logToStep(`⚠ 部分软件源更新失败 (非关键): ${warnings.length} 个`)
    }

    this.logToStep(`✓ 软件包列表更新完成 (${hitCount} cached, ${getCount} fetched)`)
  }

  // Special handling for apt-get upgrade
  private async execAptUpgrade(): Promise<void> {
    this.logToStep('执行: apt-get upgrade (这可能需要几分钟)')
    const result = await serverService.executeCommand(
      'export DEBIAN_FRONTEND=noninteractive && apt-get upgrade -y 2>&1',
      600000 // 10 minutes timeout for upgrade
    )

    // Check for real errors
    const lines = result.output.split('\n')
    const errorLines = lines.filter(l => l.startsWith('E: ') || l.includes('dpkg: error'))

    if (errorLines.length > 0 && result.exitCode !== 0) {
      const errorMsg = errorLines.slice(0, 3).join('\n')
      this.logToStep(`✗ apt-get upgrade 失败: ${errorMsg}`)
      throw new Error(errorMsg)
    }

    // Check for upgrade summary
    const upgradedMatch = result.output.match(/(\d+)\s+upgraded/)
    const installedMatch = result.output.match(/(\d+)\s+newly installed/)
    const upgraded = upgradedMatch ? upgradedMatch[1] : '0'
    const installed = installedMatch ? installedMatch[1] : '0'

    this.logToStep(`✓ 软件包升级完成 (${upgraded} upgraded, ${installed} newly installed)`)
  }

  private async writeRemoteFile(path: string, content: string): Promise<void> {
    const escaped = content.replace(/'/g, "'\\''")
    await serverService.executeCommand(
      `cat > ${path} << 'VITEPRESS_EOF'\n${escaped}\nVITEPRESS_EOF`
    )
  }

  private generateWelcomePage(config: ServerInitConfig): string {
    const accessUrl = config.domain
      ? `https://${config.domain}`
      : config.serverIp
        ? `http://${config.serverIp}`
        : ''

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VitePress 部署就绪</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 600px;
    }
    .icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    p {
      font-size: 1.2em;
      opacity: 0.9;
      margin-bottom: 30px;
      line-height: 1.6;
    }
    .info {
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .info-item:last-child { border-bottom: none; }
    .label { opacity: 0.8; }
    .value { font-weight: bold; }
    .footer {
      margin-top: 40px;
      opacity: 0.7;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚀</div>
    <h1>服务器初始化完成</h1>
    <p>您的 VitePress 部署环境已准备就绪！<br>现在可以通过管理后台一键部署您的项目了。</p>
    <div class="info">
      <div class="info-item">
        <span class="label">Web 服务器</span>
        <span class="value">Nginx</span>
      </div>
      <div class="info-item">
        <span class="label">运行环境</span>
        <span class="value">Node.js + pnpm</span>
      </div>
      <div class="info-item">
        <span class="label">进程管理</span>
        <span class="value">PM2</span>
      </div>
      <div class="info-item">
        <span class="label">部署路径</span>
        <span class="value">${config.webRoot || '/var/www/vitepress'}</span>
      </div>
      ${
        accessUrl
          ? `<div class="info-item">
        <span class="label">访问地址</span>
        <span class="value">${accessUrl}</span>
      </div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>部署项目后，此页面将被您的 VitePress 站点替换</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateNginxConfig(config: ServerInitConfig, webRoot: string): string {
    // Use domain if available, otherwise use server IP, fallback to wildcard
    const serverName = config.domain || config.serverIp || '_'
    const accessInfo = config.domain
      ? `域名: ${config.domain}`
      : config.serverIp
        ? `IP: ${config.serverIp}`
        : '所有请求'

    return `# VitePress site configuration
# Access via: ${accessInfo}
server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};
    root ${webRoot};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
}
`
  }

  private generateNginxSslConfig(config: ServerInitConfig, webRoot: string): string {
    const serverName = config.domain || ''
    const certPath = config.sslCertPath || `/etc/letsencrypt/live/${serverName}/fullchain.pem`
    const keyPath = config.sslKeyPath || `/etc/letsencrypt/live/${serverName}/privkey.pem`

    return `server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${serverName};
    root ${webRoot};
    index index.html;

    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
}
`
  }

  private emitProgress(): void {
    if (!this.broadcast || !this.currentTask) return

    const messageType =
      this.currentTask.status === 'running'
        ? 'init:progress'
        : this.currentTask.status === 'success'
          ? 'init:complete'
          : 'init:error'

    this.broadcast({
      type: messageType,
      taskId: this.currentTask.id,
      task: this.currentTask
    })
  }
}

export const serverInitService = new ServerInitService()
