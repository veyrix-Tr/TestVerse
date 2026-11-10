const express = require('express')
const router = express.Router()
const {
  getWebsiteSettings,
  updateWebsiteSettings,
} = require('../controllers/adminWebsiteController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// GET /api/admin/website - Get website settings
router.get('/', requireAuth, requireAdmin, getWebsiteSettings)

// PUT /api/admin/website - Update website settings
router.put('/', requireAuth, requireAdmin, updateWebsiteSettings)

module.exports = router
