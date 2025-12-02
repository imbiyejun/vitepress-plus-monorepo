const locks = new Map<string, boolean>()
const LOCK_TIMEOUT = 30000 // 30秒超时

/**
 * 获取文件锁
 * @param filePath 文件路径
 */
export const acquireLock = async (filePath: string): Promise<void> => {
  if (locks.get(filePath)) {
    throw new Error('文件已被锁定')
  }

  locks.set(filePath, true)

  // 设置超时自动释放锁
  setTimeout(() => {
    if (locks.get(filePath)) {
      releaseLock(filePath)
    }
  }, LOCK_TIMEOUT)
}

/**
 * 释放文件锁
 * @param filePath 文件路径
 */
export const releaseLock = async (filePath: string): Promise<void> => {
  locks.delete(filePath)
}

/**
 * 检查文件是否被锁定
 * @param filePath 文件路径
 */
export const isLocked = (filePath: string): boolean => {
  return locks.get(filePath) || false
}
