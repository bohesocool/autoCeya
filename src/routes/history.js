const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const reportController = require('../controllers/reportController');
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
 * /api/history/{id}/export/pdf:
 *   get:
 *     summary: 导出 PDF 报告
 *     description: |
 *       将指定历史记录的测试结果导出为 PDF 格式文件。
 *       PDF 报告包含：测试配置信息、统计数据、分钟统计表格、错误摘要。
 *       文件名格式：autoceya_report_{模型名}_{日期时间}.pdf
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
 *         description: 成功导出 PDF 文件
 *         headers:
 *           Content-Disposition:
 *             description: 附件下载，包含文件名
 *             schema:
 *               type: string
 *               example: attachment; filename="autoceya_report_gpt-4_20231215_143052.pdf"
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 历史记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 历史记录不存在
 *       401:
 *         description: 未授权
 *       500:
 *         description: 导出失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: PDF 生成失败
 */
router.get('/:id/export/pdf', authenticate, validateId, asyncHandler(reportController.exportPDF));

/**
 * @swagger
 * /api/history/{id}/export/excel:
 *   get:
 *     summary: 导出 Excel 报告
 *     description: |
 *       将指定历史记录的测试结果导出为 Excel 格式文件。
 *       Excel 报告包含三个工作表：
 *       - 测试摘要：基本配置和统计信息
 *       - 分钟统计：每分钟的详细数据
 *       - 错误详情：错误类型和数量
 *       文件名格式：autoceya_report_{模型名}_{日期时间}.xlsx
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
 *         description: 成功导出 Excel 文件
 *         headers:
 *           Content-Disposition:
 *             description: 附件下载，包含文件名
 *             schema:
 *               type: string
 *               example: attachment; filename="autoceya_report_gpt-4_20231215_143052.xlsx"
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 历史记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 历史记录不存在
 *       401:
 *         description: 未授权
 *       500:
 *         description: 导出失败
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Excel 生成失败
 */
router.get('/:id/export/excel', authenticate, validateId, asyncHandler(reportController.exportExcel));

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


