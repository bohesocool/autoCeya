const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: 创建定时任务
 *     tags: [定时任务]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - testConfig
 *               - scheduleType
 *             properties:
 *               name:
 *                 type: string
 *                 description: 任务名称
 *               description:
 *                 type: string
 *                 description: 任务描述
 *               testConfig:
 *                 type: object
 *                 description: 测试配置
 *               scheduleType:
 *                 type: string
 *                 enum: [once, recurring]
 *                 description: 调度类型
 *               runAt:
 *                 type: string
 *                 format: date-time
 *                 description: 一次性执行时间（ISO 8601）
 *               cronExpression:
 *                 type: string
 *                 description: Cron 表达式（重复执行）
 *               enabled:
 *                 type: boolean
 *                 description: 是否启用
 *     responses:
 *       201:
 *         description: 任务创建成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 */
router.post('/', authenticate, asyncHandler(scheduleController.createSchedule));


/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: 获取所有定时任务
 *     tags: [定时任务]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取任务列表
 *       401:
 *         description: 未授权
 */
router.get('/', authenticate, asyncHandler(scheduleController.getAllSchedules));

/**
 * @swagger
 * /api/schedules/{id}:
 *   get:
 *     summary: 获取任务详情
 *     tags: [定时任务]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务 ID
 *     responses:
 *       200:
 *         description: 成功获取任务详情
 *       400:
 *         description: 无效的任务 ID
 *       404:
 *         description: 任务不存在
 *       401:
 *         description: 未授权
 */
router.get('/:id', authenticate, asyncHandler(scheduleController.getScheduleById));

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: 更新任务配置
 *     tags: [定时任务]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               testConfig:
 *                 type: object
 *               scheduleType:
 *                 type: string
 *                 enum: [once, recurring]
 *               runAt:
 *                 type: string
 *                 format: date-time
 *               cronExpression:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 任务更新成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 任务不存在
 *       401:
 *         description: 未授权
 */
router.put('/:id', authenticate, asyncHandler(scheduleController.updateSchedule));


/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: 删除任务
 *     tags: [定时任务]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务 ID
 *     responses:
 *       200:
 *         description: 任务删除成功
 *       400:
 *         description: 无效的任务 ID
 *       404:
 *         description: 任务不存在
 *       401:
 *         description: 未授权
 */
router.delete('/:id', authenticate, asyncHandler(scheduleController.deleteSchedule));

/**
 * @swagger
 * /api/schedules/{id}/toggle:
 *   post:
 *     summary: 切换任务启用状态
 *     tags: [定时任务]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 任务 ID
 *     responses:
 *       200:
 *         description: 状态切换成功
 *       400:
 *         description: 无效的任务 ID
 *       404:
 *         description: 任务不存在
 *       401:
 *         description: 未授权
 */
router.post('/:id/toggle', authenticate, asyncHandler(scheduleController.toggleSchedule));

module.exports = router;
