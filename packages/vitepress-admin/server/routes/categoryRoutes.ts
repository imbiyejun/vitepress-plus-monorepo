import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  updateCategoriesOrder,
  addTopic
} from '../controllers/categoryController'

const router: ExpressRouter = Router()

// 获取所有专题大类
router.get('/', getCategories)

// 添加专题大类
router.post('/', addCategory)

// 更新专题大类
router.put('/:id', updateCategory)

// 删除专题大类
router.delete('/:id', deleteCategory)

// 更新专题大类排序
router.put('/order/batch', updateCategoriesOrder)

// 添加专题
router.post('/topics', addTopic)

export default router
