/**
 * 报告控制器
 * 处理测试报告导出相关的 API 请求
 */

const db = require('../../database');
const ReportService = require('../services/reportService');
const { AppError } = require('../middlewares/errorHandler');

const reportService = new ReportService();

/**
 * 将数据库记录转换为报告数据格式
 * @param {Object} record - 数据库记录
 * @returns {Object} 报告数据
 */
const transformToReportData = (record) => {
  return {
    id: record.id,
    startTime: record.start_time,
    endTime: record.end_time,
    duration: record.duration,
    testUrl: record.test_url,
    modelName: record.model_name,
    testMode: record.test_mode,
    promptMode: record.prompt_mode,
    requestType: record.request_type,
    targetRPM: record.target_rpm,
    maxRPM: record.max_rpm,
    totalRequests: record.total_requests,
    successCount: record.success_count,
    failureCount: record.failure_count,
    successRate: record.success_rate,
    avgResponseTime: record.avg_response_time,
    stopReason: record.stop_reason,
    minuteStats: record.minuteStats || [],
    errorSummary: record.errorSummary || {}
  };
};

/**
 * 导出 PDF 报告
 * GET /api/history/:id/export/pdf
 */
const exportPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 获取历史记录详情
    const record = db.getHistoryDetail(id);
    
    if (!record) {
      throw new AppError('历史记录不存在', 404);
    }
    
    // 转换数据格式
    const reportData = transformToReportData(record);
    
    // 生成 PDF
    const pdfBuffer = await reportService.generatePDF(reportData);
    
    // 生成文件名
    const fileName = reportService.generateFileName(reportData.modelName, 'pdf');
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // 发送文件
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * 导出 Excel 报告
 * GET /api/history/:id/export/excel
 */
const exportExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 获取历史记录详情
    const record = db.getHistoryDetail(id);
    
    if (!record) {
      throw new AppError('历史记录不存在', 404);
    }
    
    // 转换数据格式
    const reportData = transformToReportData(record);
    
    // 生成 Excel
    const excelBuffer = await reportService.generateExcel(reportData);
    
    // 生成文件名
    const fileName = reportService.generateFileName(reportData.modelName, 'xlsx');
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // 发送文件
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportPDF,
  exportExcel
};
