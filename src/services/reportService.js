/**
 * 报告服务类
 * 负责协调 PDF 和 Excel 报告的生成
 */

const PDFGenerator = require('../utils/pdfGenerator');
const ExcelGenerator = require('../utils/excelGenerator');

class ReportService {
  constructor() {
    this.pdfGenerator = new PDFGenerator();
    this.excelGenerator = new ExcelGenerator();
  }

  /**
   * 生成 PDF 报告
   * @param {Object} historyData - 历史记录数据
   * @returns {Buffer} PDF 文件缓冲区
   */
  async generatePDF(historyData) {
    return this.pdfGenerator.generate(historyData);
  }

  /**
   * 生成 Excel 报告
   * @param {Object} historyData - 历史记录数据
   * @returns {Buffer} Excel 文件缓冲区
   */
  async generateExcel(historyData) {
    return this.excelGenerator.generate(historyData);
  }

  /**
   * 清理文件名中的特殊字符
   * 将所有非字母数字和中文字符替换为下划线
   * @param {string} name - 原始名称
   * @returns {string} 清理后的名称
   */
  sanitizeFileName(name) {
    if (!name || typeof name !== 'string') {
      return 'unknown';
    }
    // 将特殊字符替换为下划线（保留字母、数字、中文、连字符）
    // 匹配所有不是字母、数字、中文、连字符的字符
    let sanitized = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '_');
    // 将连续的下划线合并为单个下划线
    sanitized = sanitized.replace(/_+/g, '_');
    // 移除首尾的下划线
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    // 如果结果为空，返回 'unknown'
    return sanitized || 'unknown';
  }

  /**
   * 生成文件名
   * 格式: autoceya_report_{模型名}_{日期时间}.{扩展名}
   * @param {string} modelName - 模型名称
   * @param {string} format - 文件格式 (pdf/xlsx)
   * @param {Date} [date] - 可选的日期参数，用于测试
   * @returns {string} 文件名
   */
  generateFileName(modelName, format, date = new Date()) {
    const sanitizedModel = this.sanitizeFileName(modelName);
    // 格式化日期时间为 YYYYMMDD_HHmmss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    return `autoceya_report_${sanitizedModel}_${dateTime}.${format}`;
  }
}

module.exports = ReportService;
