import { Client as SSHClient, type SFTPWrapper } from 'ssh2'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import type { WebSocket } from 'ws'
import { getProjectRoot } from '../config/paths.js'

export interface DeployConfig {
  host: string
  port: number
  username: string
  password: string
  remotePath: string
}

export type DeployStepStatus = 'pending' | 'running' | 'success' | 'error'

export interface DeployStep {
  id: string
  title: string
  status: DeployStepStatus
  message?: string
  logs?: string[]
  startTime?: number
  endTime?: number
}

export interface DeployTask {
  id: string
  status: 'running' | 'success' | 'error'
  steps: DeployStep[]
  result?: {
    zipSize?: string
    remotePath?: string
    backupPath?: string
  }
  error?: string
  startTime: number
  endTime?: number
}

export interface DeployMessage {
  type: 'deploy:progress' | 'deploy:complete' | 'deploy:error'
  taskId: string
  task: DeployTask
}

// Deploy step definitions
const DEPLOY_STEPS: Array<{ id: string; title: string }> = [
  { id: 'build', title: '构建项目' },
  { id: 'compress', title: '压缩打包' },
  { id: 'connect', title: '连接服务器' },
  { id: 'upload', title: '上传文件' },
  { id: 'backup', title: '备份旧版本' },
  { id: 'extract', title: '解压部署' },
  { id: 'cleanup', title: '清理临时文件' }
]

type BroadcastFn = (message: DeployMessage) => void

class DeployService {
  private clients: Set<WebSocket> = new Set()
  private currentTask: DeployTask | null = null
  private broadcastFn: BroadcastFn | null = null

  setBroadcast(fn: BroadcastFn): void {
    this.broadcastFn = fn
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws)
    ws.on('close', () => this.clients.delete(ws))
  }

  private broadcast(message: DeployMessage): void {
    // Use external broadcast if available, otherwise use internal clients
    if (this.broadcastFn) {
      this.broadcastFn(message)
    } else {
      const data = JSON.stringify(message)
      this.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(data)
        }
      })
    }
  }

  private createTask(): DeployTask {
    return {
      id: `deploy-${Date.now()}`,
      status: 'running',
      steps: DEPLOY_STEPS.map(s => ({ ...s, status: 'pending' as DeployStepStatus })),
      startTime: Date.now()
    }
  }

  // Log message to current running step
  private logToStep(message: string): void {
    if (!this.currentTask) return
    const runningStep = this.currentTask.steps.find(s => s.status === 'running')
    if (runningStep) {
      if (!runningStep.logs) runningStep.logs = []
      runningStep.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`)
      this.broadcast({
        type: 'deploy:progress',
        taskId: this.currentTask.id,
        task: this.currentTask
      })
    }
  }

  private updateStep(
    task: DeployTask,
    stepId: string,
    status: DeployStepStatus,
    message?: string
  ): void {
    const step = task.steps.find(s => s.id === stepId)
    if (step) {
      step.status = status
      step.message = message
      if (status === 'running') {
        step.startTime = Date.now()
        step.logs = []
      } else if (status === 'success' || status === 'error') {
        step.endTime = Date.now()
      }
    }
    this.broadcast({ type: 'deploy:progress', taskId: task.id, task })
  }

  getCurrentTask(): DeployTask | null {
    return this.currentTask
  }

  isRunning(): boolean {
    return this.currentTask?.status === 'running'
  }

  async startDeploy(config: DeployConfig): Promise<string> {
    if (this.isRunning()) {
      throw new Error('已有部署任务正在执行')
    }

    const task = this.createTask()
    this.currentTask = task
    this.broadcast({ type: 'deploy:progress', taskId: task.id, task })

    // Run deploy in background
    this.runDeploy(task, config).catch(error => {
      console.error('Deploy error:', error)
    })

    return task.id
  }

  private async runDeploy(task: DeployTask, config: DeployConfig): Promise<void> {
    const projectRoot = getProjectRoot()
    const distPath = path.join(projectRoot, '.vitepress', 'dist')
    const timestamp = this.getTimestamp()
    const zipFileName = `deploy-${timestamp}.zip`
    const localZipPath = path.join(projectRoot, zipFileName)

    const remotePath = config.remotePath.replace(/\/$/, '')
    const remoteParent = path.dirname(remotePath).replace(/\\/g, '/')
    const remoteDirName = path.basename(remotePath)
    const backupDirName = `${remoteDirName}_backup_${timestamp}`
    const backupPath = `${remoteParent}/${backupDirName}`
    const tempExtractPath = `${remoteParent}/${remoteDirName}_new_${timestamp}`
    const remoteZipPath = `${remoteParent}/${zipFileName}`

    const client = new SSHClient()
    let zipSize = 0
    let hasBackup = false

    try {
      // Step 1: Build
      this.updateStep(task, 'build', 'running')
      this.logToStep('开始构建项目...')
      this.logToStep(`项目路径: ${projectRoot}`)
      await this.runBuild(projectRoot)
      this.logToStep('✓ 项目构建完成')
      this.updateStep(task, 'build', 'success')

      if (!fs.existsSync(distPath) || fs.readdirSync(distPath).length === 0) {
        throw new Error('构建后 dist 目录为空')
      }

      // Step 2: Compress
      this.updateStep(task, 'compress', 'running')
      this.logToStep(`正在压缩 dist 目录: ${distPath}`)
      zipSize = await this.createZipArchive(distPath, localZipPath)
      this.logToStep(`✓ 压缩完成: ${(zipSize / 1024 / 1024).toFixed(2)} MB`)
      this.updateStep(task, 'compress', 'success', `${(zipSize / 1024 / 1024).toFixed(2)} MB`)

      // Step 3: Connect
      this.updateStep(task, 'connect', 'running')
      this.logToStep(`正在连接服务器: ${config.host}:${config.port}`)
      this.logToStep(`用户名: ${config.username}`)
      await this.connectSSH(client, config)
      this.logToStep('✓ SSH 连接成功')
      this.updateStep(task, 'connect', 'success')

      // Step 4: Upload
      this.updateStep(task, 'upload', 'running')
      this.logToStep(`获取 SFTP 连接...`)
      const sftp = await this.getSFTP(client)
      this.logToStep(`确保远程目录存在: ${remoteParent}`)
      await this.mkdirRecursive(sftp, remoteParent)
      this.logToStep(`正在上传文件: ${zipFileName}`)
      await this.uploadFile(sftp, localZipPath, remoteZipPath)
      this.logToStep(`✓ 文件上传完成: ${remoteZipPath}`)
      this.updateStep(task, 'upload', 'success')

      // Step 5: Backup
      this.updateStep(task, 'backup', 'running')
      this.logToStep(`检查是否存在旧版本: ${remotePath}`)
      const checkResult = await this.execCommand(
        client,
        `test -d ${remotePath} && echo "exists" || echo "not_exists"`
      )
      if (checkResult.trim() === 'exists') {
        this.logToStep(`发现旧版本，正在备份...`)
        await this.execCommand(client, `mv ${remotePath} ${backupPath}`)
        hasBackup = true
        this.logToStep(`✓ 备份完成: ${backupPath}`)
        this.updateStep(task, 'backup', 'success', backupPath)
      } else {
        this.logToStep('无旧版本，跳过备份')
        this.updateStep(task, 'backup', 'success', '无需备份')
      }

      // Step 6: Extract
      this.updateStep(task, 'extract', 'running')

      // Check if unzip is installed
      this.logToStep('检查 unzip 命令是否可用...')
      const unzipCheck = await this.execCommandSafe(client, 'which unzip')
      if (!unzipCheck.success) {
        this.logToStep('unzip 未安装，正在自动安装...')
        try {
          // Detect package manager and install unzip
          const hasApt = await this.execCommandSafe(client, 'which apt-get')
          const hasYum = await this.execCommandSafe(client, 'which yum')
          const hasDnf = await this.execCommandSafe(client, 'which dnf')

          if (hasApt.success) {
            // Debian/Ubuntu
            this.logToStep('检测到 apt 包管理器')
            const updateResult = await this.execCommandSafe(
              client,
              'DEBIAN_FRONTEND=noninteractive apt-get update 2>&1',
              180000
            )
            if (updateResult.output) {
              this.logToStep(`apt-get update: ${updateResult.output.slice(-200)}`)
            }
            this.logToStep('正在安装 unzip...')
            const installResult = await this.execCommandSafe(
              client,
              'DEBIAN_FRONTEND=noninteractive apt-get install -y unzip 2>&1',
              180000
            )
            if (!installResult.success) {
              this.logToStep(`安装输出: ${installResult.output}`)
              throw new Error(installResult.output || '安装失败')
            }
          } else if (hasDnf.success) {
            // Fedora/RHEL 8+
            this.logToStep('检测到 dnf 包管理器')
            const installResult = await this.execCommandSafe(
              client,
              'dnf install -y unzip 2>&1',
              180000
            )
            if (!installResult.success) {
              throw new Error(installResult.output || '安装失败')
            }
          } else if (hasYum.success) {
            // CentOS/RHEL 7
            this.logToStep('检测到 yum 包管理器')
            const installResult = await this.execCommandSafe(
              client,
              'yum install -y unzip 2>&1',
              180000
            )
            if (!installResult.success) {
              throw new Error(installResult.output || '安装失败')
            }
          } else {
            throw new Error('未检测到支持的包管理器 (apt/yum/dnf)')
          }

          // Verify installation
          const verifyCheck = await this.execCommandSafe(client, 'which unzip')
          if (!verifyCheck.success) {
            throw new Error('unzip 安装后仍无法找到')
          }
          this.logToStep('✓ unzip 安装成功')
        } catch (installErr) {
          const errMsg = installErr instanceof Error ? installErr.message : '未知错误'
          this.logToStep(`✗ 安装失败: ${errMsg}`)
          throw new Error(
            `安装 unzip 失败: ${errMsg}\n请手动在服务器上执行: apt-get install unzip 或 yum install unzip`
          )
        }
      } else {
        this.logToStep('✓ unzip 已安装')
      }

      this.logToStep(`创建临时解压目录: ${tempExtractPath}`)
      await this.execCommand(client, `mkdir -p ${tempExtractPath}`)
      this.logToStep('正在解压文件...')
      await this.execCommand(
        client,
        `cd ${remoteParent} && unzip -o ${zipFileName} -d ${tempExtractPath}`
      )
      this.logToStep(`移动到目标路径: ${remotePath}`)
      await this.execCommand(client, `mv ${tempExtractPath} ${remotePath}`)
      this.logToStep('✓ 解压部署完成')
      this.updateStep(task, 'extract', 'success')

      // Step 7: Cleanup
      this.updateStep(task, 'cleanup', 'running')
      this.logToStep('删除远程临时文件...')
      await this.execCommand(client, `rm -f ${remoteZipPath}`)
      client.end()
      this.logToStep('删除本地临时文件...')
      fs.unlinkSync(localZipPath)
      this.logToStep('✓ 清理完成')
      this.updateStep(task, 'cleanup', 'success')

      // Complete
      task.status = 'success'
      task.endTime = Date.now()
      task.result = {
        zipSize: `${(zipSize / 1024 / 1024).toFixed(2)} MB`,
        remotePath: remotePath
      }
      if (hasBackup) {
        task.result.backupPath = backupPath
      }

      this.broadcast({ type: 'deploy:complete', taskId: task.id, task })
    } catch (error) {
      client.end()
      if (fs.existsSync(localZipPath)) {
        fs.unlinkSync(localZipPath)
      }

      const currentStep = task.steps.find(s => s.status === 'running')
      if (currentStep) {
        currentStep.status = 'error'
        currentStep.message = error instanceof Error ? error.message : '未知错误'
        currentStep.endTime = Date.now()
      }

      task.status = 'error'
      task.endTime = Date.now()
      task.error = error instanceof Error ? error.message : '未知错误'

      this.broadcast({ type: 'deploy:error', taskId: task.id, task })
    }
  }

  private getTimestamp(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  }

  private runBuild(projectRoot: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32'
      const npxCmd = isWindows ? 'npx.cmd' : 'npx'

      const child = spawn(npxCmd, ['vitepress', 'build', '.'], {
        cwd: projectRoot,
        stdio: 'pipe',
        shell: false
      })

      let stderr = ''

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`构建失败: ${stderr || `exit code ${code}`}`))
        }
      })

      child.on('error', err => {
        reject(new Error(`构建命令执行失败: ${err.message}`))
      })
    })
  }

  private createZipArchive(distPath: string, zipPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => resolve(archive.pointer()))
      archive.on('error', reject)

      archive.pipe(output)
      archive.directory(distPath, false)
      archive.finalize()
    })
  }

  private connectSSH(client: SSHClient, config: DeployConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end()
        reject(new Error('连接超时'))
      }, 30000)

      client.on('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      client.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      })
    })
  }

  private getSFTP(client: SSHClient): Promise<SFTPWrapper> {
    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) reject(err)
        else resolve(sftp)
      })
    })
  }

  private uploadFile(sftp: SFTPWrapper, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(localPath)
      const writeStream = sftp.createWriteStream(remotePath)

      writeStream.on('close', () => resolve())
      writeStream.on('error', reject)
      readStream.on('error', reject)

      readStream.pipe(writeStream)
    })
  }

  private execCommand(client: SSHClient, command: string, timeout = 120000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timeout after ${timeout}ms`))
      }, timeout)

      client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer)
          reject(err)
          return
        }

        let stdout = ''
        let stderr = ''

        stream.on('close', (code: number) => {
          clearTimeout(timer)
          if (code === 0) {
            resolve(stdout)
          } else {
            reject(new Error(stderr || `Command exited with code ${code}`))
          }
        })

        stream.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })
      })
    })
  }

  // Execute command without throwing on non-zero exit code
  private execCommandSafe(
    client: SSHClient,
    command: string,
    timeout = 120000
  ): Promise<{ success: boolean; output: string }> {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        resolve({ success: false, output: `Command timeout after ${timeout}ms` })
      }, timeout)

      client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer)
          resolve({ success: false, output: err.message })
          return
        }

        let stdout = ''
        let stderr = ''

        stream.on('close', (code: number) => {
          clearTimeout(timer)
          resolve({
            success: code === 0,
            output: stdout || stderr
          })
        })

        stream.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })
      })
    })
  }

  private mkdirRecursive(sftp: SFTPWrapper, dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.stat(dirPath, err => {
        if (!err) {
          resolve()
          return
        }

        const parentDir = path.dirname(dirPath).replace(/\\/g, '/')
        if (parentDir === dirPath || parentDir === '/' || parentDir === '.') {
          sftp.mkdir(dirPath, mkdirErr => {
            if (mkdirErr && (mkdirErr as NodeJS.ErrnoException).code !== 'EEXIST') {
              reject(mkdirErr)
            } else {
              resolve()
            }
          })
          return
        }

        this.mkdirRecursive(sftp, parentDir)
          .then(() => {
            sftp.mkdir(dirPath, mkdirErr => {
              if (mkdirErr && (mkdirErr as NodeJS.ErrnoException).code !== 'EEXIST') {
                reject(mkdirErr)
              } else {
                resolve()
              }
            })
          })
          .catch(reject)
      })
    })
  }
}

export const deployService = new DeployService()
