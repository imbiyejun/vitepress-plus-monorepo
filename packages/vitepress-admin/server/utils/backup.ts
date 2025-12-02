import { promises as fs } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BACKUP_DIR = join(__dirname, '../backups')

/**
 * 确保备份目录存在
 */
const ensureBackupDir = async () => {
  try {
    await fs.access(BACKUP_DIR)
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  }
}

/**
 * 备份文件
 * @param filePath 需要备份的文件路径
 */
export const backupFile = async (filePath: string): Promise<void> => {
  await ensureBackupDir()

  const fileName = basename(filePath)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(BACKUP_DIR, `${fileName}.${timestamp}.bak`)

  try {
    await fs.copyFile(filePath, backupPath)
  } catch (error) {
    throw new Error(`备份文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 恢复文件
 * @param filePath 需要恢复的文件路径
 */
export const restoreFile = async (filePath: string): Promise<void> => {
  const fileName = basename(filePath)
  const backups = await fs.readdir(BACKUP_DIR)

  // 获取该文件的所有备份
  const fileBackups = backups
    .filter(backup => backup.startsWith(fileName))
    .sort()
    .reverse()

  if (fileBackups.length === 0) {
    throw new Error('没有找到备份文件')
  }

  // 使用最新的备份
  const latestBackup = join(BACKUP_DIR, fileBackups[0])

  try {
    await fs.copyFile(latestBackup, filePath)
  } catch (error) {
    throw new Error(`恢复文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 列出文件的所有备份
 * @param filePath 文件路径
 */
export const listBackups = async (filePath: string): Promise<string[]> => {
  await ensureBackupDir()

  const fileName = basename(filePath)
  const backups = await fs.readdir(BACKUP_DIR)

  return backups
    .filter(backup => backup.startsWith(fileName))
    .sort()
    .reverse()
}
