const express = require('express');
const router = express.Router();
const parallelController = require('../controllers/parallelController');
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * @swagger
 * /api/parallel/start:
 *   post:
 *     summary: 启动并行测试
 *     tags: [并行测试]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configs
 *             properties:
 *               configs:
 *                 type: array
 *                 maxItems: 5
 *                 description: 测试配置数组（最多5个）
 *                 items:
 *                   type: object
 *                   required:
 *                     - url
 *                     - modelName
 *                     - apiKey
 *                     - providerType
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: API 端点 URL
 *                     modelName:
 *                       type: string
 *                       description: 模型名称
 *                     apiKey:
 *                       type: string
 *                       description: API 密钥
 *                     providerType:
 *                       type: string
 *                       enum: [openai, claude, gemini]
 *                       description: 提供商类型
 *                     rpm:
 *                       type: number
 *                       description: 每分钟请求数
 *                     testDuration:
 *                       type: number
 *                       description: 测试时长（分钟）
 *     responses:
 *       201:
 *         description: 并行测试已启动
 *       400:
 *         description: 参数错误或配置数量超过限制
 *       401:
 *         description: 未授权
 */
router.post('/start', authenticate, asyncHandler(parallelController.startParallelTest));


/**
 * @swagger
 * /api/parallel/stop:
 *   post:
 *     summary: 停止所有并行测试
 *     tags: [并行测试]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 并行测试已停止
 *       400:
 *         description: 没有正在运行的并行测试
 *       401:
 *         description: 未授权
 */
router.post('/stop', authenticate, asyncHandler(parallelController.stopParallelTest));

/**
 * @swagger
 * /api/parallel/status:
 *   get:
 *     summary: 获取所有并行测试状态
 *     tags: [并行测试]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取并行测试状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     parallelId:
 *                       type: string
 *                       description: 并行测试 ID
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       description: 开始时间
 *                     isRunning:
 *                       type: boolean
 *                       description: 是否正在运行
 *                     testCount:
 *                       type: number
 *                       description: 测试数量
 *                     tests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           testId:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, running, completed, failed, stopped]
 *                           stats:
 *                             type: object
 *                             properties:
 *                               totalRequests:
 *                                 type: number
 *                               successCount:
 *                                 type: number
 *                               failureCount:
 *                                 type: number
 *                               successRate:
 *                                 type: number
 *                               avgResponseTime:
 *                                 type: number
 *                               currentRPM:
 *                                 type: number
 *       401:
 *         description: 未授权
 */
router.get('/status', authenticate, asyncHandler(parallelController.getParallelStatus));

module.exports = router;
