import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import {
  readTopicConfig,
  updateTopicConfig,
  listTopics,
  restoreTopicConfig,
  getTopicDetail,
  updateTopicDetail,
  deleteTopic,
  updateTopicsOrder
} from '../controllers/topicController'

const router: ExpressRouter = Router()

// 获取专题列表
router.get('/topics', listTopics)

// 获取专题详情
router.get('/topic/:slug', getTopicDetail)

// 更新专题详情（包括同步文档和配置）
router.put('/topic/:slug', updateTopicDetail)

// 删除专题
router.delete('/topic/:slug', deleteTopic)

// 读取专题配置文件
router.get('/topic/config/:filename', readTopicConfig)

// 更新专题配置文件
router.put('/topic/config/:filename', updateTopicConfig)

// 恢复专题配置文件
router.post('/topic/config/:filename/restore', restoreTopicConfig)

// 批量更新专题顺序
router.put('/topics/order/batch', updateTopicsOrder)

export default router
