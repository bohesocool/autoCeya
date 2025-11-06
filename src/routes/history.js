const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate } = require('../middlewares/auth');
const { validatePagination, validateId } = require('../middlewares/validator');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: 获取历史记录列表
 *     tags: [历史记录]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功获取历史记录
 *       401:
 *         description: 未授权
 */
router.get('/', authenticate, validatePagination, asyncHandler(historyController.getHistoryList));

/**
 * @swagger
 * /api/history/{id}:
 *   get:
 *     summary: 获取单条历史记录详情
 *     tags: [历史记录]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 历史记录ID
 *     responses:
 *       200:
 *         description: 成功获取历史详情
 *       404:
 *         description: 历史记录不存在
 *       401:
 *         description: 未授权
 */
router.get('/:id', authenticate, validateId, asyncHandler(historyController.getHistoryDetail));

/**
 * @swagger
 * /api/history/{id}:
 *   delete:
 *     summary: 删除历史记录
 *     tags: [历史记录]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 历史记录ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 历史记录不存在
 *       401:
 *         description: 未授权
 */
router.delete('/:id', authenticate, validateId, asyncHandler(historyController.deleteHistory));

/**
 * @swagger
 * /api/history/clear:
 *   post:
 *     summary: 清空所有历史记录
 *     tags: [历史记录]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 清空成功
 *       401:
 *         description: 未授权
 */
router.post('/clear', authenticate, asyncHandler(historyController.clearHistory));

module.exports = router;

