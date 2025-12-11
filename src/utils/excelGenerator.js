/**
 * Excel 生成器类
 * 使用 exceljs 库生成 Excel 报告
 */

const ExcelJS = require('exceljs');

class ExcelGenerator {
  /**
   * 生成 Excel 工作簿
   * @param {Object} data - 报告数据
   * @returns {Promise<Buffer>} Excel 缓冲区
   */
  async generate(data) {
    const workbook = new ExcelJS.Workbook();
    
    // 设置工作簿属性
    workbook.creator = 'AutoCeya';
    workbook.created = new Date();
    workbook.lastModifiedBy = 'AutoCeya';
    workbook.modified = new Date();

    // 创建各工作表
    this.createSummarySheet(workbook, data);
    this.createMinuteStatsSheet(workbook, data.minuteStats || []);
    this.createErrorSheet(workbook, data.errorSummary || {});

    // 返回 Buffer
    return workbook.xlsx.writeBuffer();
  }

  /**
   * 创建测试摘要工作表
   * 包含基本配置和统计信息
   * @param {Workbook} workbook - 工作簿
   * @param {Object} data - 报告数据
   */
  createSummarySheet(workbook, data) {
    const sheet = workbook.addWorksheet('测试摘要');
    
    // 设置列宽
    sheet.columns = [
      { header: '项目', key: 'item', width: 25 },
      { header: '值', key: 'value', width: 45 }
    ];

    // 设置表头样式
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 添加测试配置信息
    const configData = [
      { item: '测试 URL', value: data.testUrl || '-' },
      { item: '模型名称', value: data.modelName || '-' },
      { item: '测试模式', value: data.testMode || '-' },
      { item: '提示模式', value: data.promptMode || '-' },
      { item: '请求类型', value: data.requestType || '-' },
      { item: '目标 RPM', value: data.targetRPM !== undefined ? String(data.targetRPM) : '-' },
      { item: '最大 RPM', value: data.maxRPM !== undefined ? String(data.maxRPM) : '-' },
      { item: '开始时间', value: data.startTime || '-' },
      { item: '结束时间', value: data.endTime || '-' },
      { item: '持续时间（秒）', value: data.duration !== undefined ? String(data.duration) : '-' },
      { item: '', value: '' }, // 空行分隔
      { item: '总请求数', value: data.totalRequests !== undefined ? String(data.totalRequests) : '0' },
      { item: '成功数', value: data.successCount !== undefined ? String(data.successCount) : '0' },
      { item: '失败数', value: data.failureCount !== undefined ? String(data.failureCount) : '0' },
      { item: '成功率', value: data.successRate !== undefined ? `${data.successRate.toFixed(2)}%` : '-' },
      { item: '平均响应时间（ms）', value: data.avgResponseTime !== undefined ? data.avgResponseTime.toFixed(2) : '-' },
      { item: '停止原因', value: data.stopReason || '-' }
    ];

    configData.forEach(row => {
      const addedRow = sheet.addRow(row);
      addedRow.alignment = { vertical: 'middle' };
    });

    // 添加边框
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  /**
   * 创建分钟统计工作表
   * 包含每分钟的详细数据
   * @param {Workbook} workbook - 工作簿
   * @param {Array} minuteStats - 分钟统计数组
   */
  createMinuteStatsSheet(workbook, minuteStats) {
    const sheet = workbook.addWorksheet('分钟统计');
    
    // 设置列宽
    sheet.columns = [
      { header: '时间', key: 'timestamp', width: 25 },
      { header: '成功数', key: 'successCount', width: 15 },
      { header: '失败数', key: 'failureCount', width: 15 },
      { header: 'RPM', key: 'rpm', width: 15 }
    ];

    // 设置表头样式
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 添加数据行
    if (minuteStats && minuteStats.length > 0) {
      minuteStats.forEach(stat => {
        const row = sheet.addRow({
          timestamp: stat.timestamp || '-',
          successCount: stat.successCount || 0,
          failureCount: stat.failureCount || 0,
          rpm: stat.rpm || 0
        });
        row.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }

    // 添加边框
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 冻结首行
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * 创建错误详情工作表
   * 包含错误类型和数量
   * @param {Workbook} workbook - 工作簿
   * @param {Object} errors - 错误摘要
   */
  createErrorSheet(workbook, errors) {
    const sheet = workbook.addWorksheet('错误详情');
    
    // 设置列宽
    sheet.columns = [
      { header: '错误类型', key: 'type', width: 40 },
      { header: '数量', key: 'count', width: 15 }
    ];

    // 设置表头样式
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 添加数据行
    if (errors && Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([errorType, count]) => {
        const row = sheet.addRow({
          type: errorType,
          count: count
        });
        row.alignment = { vertical: 'middle' };
      });
    } else {
      // 如果没有错误，添加一行说明
      const row = sheet.addRow({
        type: '无错误记录',
        count: 0
      });
      row.alignment = { vertical: 'middle' };
    }

    // 添加边框
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 冻结首行
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
}

module.exports = ExcelGenerator;
