import express from 'express'
import { translateToSlug } from '../controllers/translate/index.js'

const router: express.Router = express.Router()

router.post('/to-slug', translateToSlug)

export default router
