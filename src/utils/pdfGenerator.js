/**
 * PDF 生成器类
 * 使用 pdfkit 库生成 PDF 报告
 */

const PDFDocument = require('pdfkit');

class PDFGenerator {
  /**
   * 生成 PDF 文档
   * @param {Object} data - 报告数据
   * @returns {Promise<Buffer>} PDF 缓冲区
   */
  async generate(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // 添加报告内容
        this.addTitle(doc, 'AutoCeya 压力测试报告');
        this.addConfigSection(doc, data);
        this.addStatsSection(doc, data);
        this.addMinuteStatsTable(doc, data.minuteStats || []);
        this.addErrorSummary(doc, data.errorSummary || {});

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 添加标题
   * @param {PDFDocument} doc - PDF 文档
   * @param {string} title - 标题文本
   */
  addTitle(doc, title) {
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown(2);
  }

  /**
   * 添加测试配置信息
   * @param {PDFDocument} doc - PDF 文档
   * @param {Object} config - 配置数据
   */
  addConfigSection(doc, config) {
    doc.fontSize(14).text('测试配置', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    const configItems = [
      { label: '测试 URL', value: config.testUrl || '-' },
      { label: '模型名称', value: config.modelName || '-' },
      { label: '测试模式', value: config.testMode || '-' },
      { label: '提示模式', value: config.promptMode || '-' },
      { label: '请求类型', value: config.requestType || '-' },
      { label: '目标 RPM', value: config.targetRPM || '-' },
      { label: '最大 RPM', value: config.maxRPM || '-' },
      { label: '开始时间', value: config.startTime || '-' },
      { label: '结束时间', value: config.endTime || '-' },
      { label: '持续时间', value: config.duration ? `${config.duration} 秒` : '-' }
    ];
    
    configItems.forEach(item => {
      doc.text(`${item.label}: ${item.value}`);
    });
    
    doc.moveDown(1.5);
  }

  /**
   * 添加统计数据
   * @param {PDFDocument} doc - PDF 文档
   * @param {Object} stats - 统计数据
   */
  addStatsSection(doc, stats) {
    doc.fontSize(14).text('统计数据', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    const statsItems = [
      { label: '总请求数', value: stats.totalRequests || 0 },
      { label: '成功数', value: stats.successCount || 0 },
      { label: '失败数', value: stats.failureCount || 0 },
      { label: '成功率', value: stats.successRate !== undefined ? `${stats.successRate.toFixed(2)}%` : '-' },
      { label: '平均响应时间', value: stats.avgResponseTime !== undefined ? `${stats.avgResponseTime.toFixed(2)} ms` : '-' },
      { label: '停止原因', value: stats.stopReason || '-' }
    ];
    
    statsItems.forEach(item => {
      doc.text(`${item.label}: ${item.value}`);
    });
    
    doc.moveDown(1.5);
  }

  /**
   * 添加分钟统计表格
   * @param {PDFDocument} doc - PDF 文档
   * @param {Array} minuteStats - 分钟统计数组
   */
  addMinuteStatsTable(doc, minuteStats) {
    doc.fontSize(14).text('分钟统计', { underline: true });
    doc.moveDown(0.5);
    
    if (!minuteStats || minuteStats.length === 0) {
      doc.fontSize(10).text('无分钟统计数据');
      doc.moveDown(1.5);
      return;
    }
    
    doc.fontSize(10);
    
    // 表头
    const headers = ['时间', '成功数', '失败数', 'RPM'];
    const colWidths = [150, 80, 80, 80];
    const startX = doc.x;
    let currentY = doc.y;
    
    // 绘制表头
    headers.forEach((header, i) => {
      doc.text(header, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
        width: colWidths[i],
        align: 'left'
      });
    });
    
    currentY += 15;
    doc.moveTo(startX, currentY).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), currentY).stroke();
    currentY += 5;
    
    // 绘制数据行
    minuteStats.forEach(stat => {
      // 检查是否需要换页
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
      }
      
      const row = [
        stat.timestamp || '-',
        String(stat.successCount || 0),
        String(stat.failureCount || 0),
        String(stat.rpm || 0)
      ];
      
      row.forEach((cell, i) => {
        doc.text(cell, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY, {
          width: colWidths[i],
          align: 'left'
        });
      });
      
      currentY += 15;
    });
    
    doc.y = currentY;
    doc.moveDown(1.5);
  }

  /**
   * 添加错误摘要
   * @param {PDFDocument} doc - PDF 文档
   * @param {Object} errors - 错误摘要
   */
  addErrorSummary(doc, errors) {
    doc.fontSize(14).text('错误摘要', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    if (!errors || Object.keys(errors).length === 0) {
      doc.text('无错误记录');
      doc.moveDown(1.5);
      return;
    }
    
    Object.entries(errors).forEach(([errorType, count]) => {
      doc.text(`${errorType}: ${count} 次`);
    });
    
    doc.moveDown(1.5);
  }
}

module.exports = PDFGenerator;
