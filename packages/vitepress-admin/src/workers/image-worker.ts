// 计算图片大小
const calculateImageSize = (base64Data: string): number => {
  const base64 = base64Data.split(',')[1]
  return atob(base64).length
}

// 监听主线程消息
self.addEventListener('message', e => {
  const { type, data } = e.data

  switch (type) {
    case 'calculate-size': {
      const size = calculateImageSize(data)
      self.postMessage({ type: 'size-calculated', size })
      break
    }
  }
})

// 确保 TypeScript 识别这是一个 Worker 文件
export {}
