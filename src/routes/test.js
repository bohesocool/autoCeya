const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authenticate } = require('../middlewares/auth');
const { validateStartTest } = require('../middlewares/validator');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * @swagger
 * /api/start:
 *   post:
 *     summary: 启动测压
 *     tags: [测压]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - modelName
 *               - apiKey
 *               - providerType
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [fixed, auto]
 *                 description: 测压模式
 *               rpm:
 *                 type: integer
 *                 description: 目标RPM（固定模式必填）
 *               url:
 *                 type: string
 *                 description: API基础URL
 *               modelName:
 *                 type: string
 *                 description: 模型名称
 *               apiKey:
 *                 type: string
 *                 description: API密钥
 *               providerType:
 *                 type: string
 *                 enum: [gemini, openai, claude]
 *                 description: AI提供商类型
 *               testPrompt:
 *                 type: string
 *                 description: 测试语句
 *               promptMode:
 *                 type: string
 *                 enum: [fixed, random]
 *                 description: 语句模式
 *               randomPrompts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 随机语句列表
 *               requestType:
 *                 type: string
 *                 enum: [stream, non-stream]
 *                 description: 请求类型
 *               testDuration:
 *                 type: integer
 *                 description: 测试时长（分钟，0表示无限制）
 *     responses:
 *       200:
 *         description: 测试启动成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 */
router.post('/start', authenticate, validateStartTest, asyncHandler(testController.startTest));

/**
 * @swagger
 * /api/stop:
 *   post:
 *     summary: 停止测压
 *     tags: [测压]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 测试停止成功
 *       400:
 *         description: 没有正在进行的测试
 *       401:
 *         description: 未授权
 */
router.post('/stop', authenticate, asyncHandler(testController.stopTest));

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: 获取当前测试状态
 *     tags: [测压]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取状态
 *       401:
 *         description: 未授权
 */
router.get('/status', authenticate, asyncHandler(testController.getStatus));

/**
 * @swagger
 * /api/clearLogs:
 *   post:
 *     summary: 清除请求日志
 *     tags: [测压]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 日志清除成功
 *       401:
 *         description: 未授权
 */
router.post('/clearLogs', authenticate, asyncHandler(testController.clearLogs));

module.exports = router;

