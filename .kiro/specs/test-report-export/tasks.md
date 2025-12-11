# 实现计划

- [ ] 1. 安装依赖并创建基础结构
  - [ ] 1.1 安装 pdfkit 和 exceljs 依赖
    - 运行 `npm install pdfkit exceljs`
    - _需求: 1.1, 2.1_

  - [ ] 1.2 创建报告服务目录结构
    - 创建 `src/services/reportService.js`
    - 创建 `src/utils/pdfGenerator.js`
    - 创建 `src/utils/excelGenerator.js`
    - _需求: 1.1, 2.1_

- [ ] 2. 实现文件名生成功能
  - [ ] 2.1 实现 sanitizeFileName 和 generateFileName 方法
    - 在 `src/services/reportService.js` 中实现
    - sanitizeFileName: 将特殊字符替换为下划线
    - generateFileName: 生成格式化文件名
    - _需求: 3.1, 3.2_

  - [ ]* 2.2 编写属性测试：文件名格式正确性
    - **Property 3: 文件名格式正确性**
    - **验证: 需求 3.1, 3.2**

- [ ] 3. 实现 PDF 生成器
  - [ ] 3.1 实现 PDFGenerator 类基础结构
    - 创建 `src/utils/pdfGenerator.js`
    - 实现 generate 方法，返回 PDF Buffer
    - 实现 addTitle 方法，添加报告标题
    - _需求: 1.1_

  - [ ] 3.2 实现 PDF 内容生成方法
    - 实现 addConfigSection: 添加测试配置信息
    - 实现 addStatsSection: 添加统计数据
    - 实现 addMinuteStatsTable: 添加分钟统计表格
    - 实现 addErrorSummary: 添加错误摘要
    - _需求: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.3 编写属性测试：PDF 报告内容完整性
    - **Property 1: PDF 报告内容完整性**
    - **验证: 需求 1.2, 1.3, 1.4, 1.5**

- [ ] 4. 实现 Excel 生成器
  - [ ] 4.1 实现 ExcelGenerator 类基础结构
    - 创建 `src/utils/excelGenerator.js`
    - 实现 generate 方法，返回 Excel Buffer
    - _需求: 2.1_

  - [ ] 4.2 实现 Excel 工作表生成方法
    - 实现 createSummarySheet: 创建测试摘要工作表
    - 实现 createMinuteStatsSheet: 创建分钟统计工作表
    - 实现 createErrorSheet: 创建错误详情工作表
    - 设置适当的列宽和格式化
    - _需求: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.3 编写属性测试：Excel 报告结构完整性
    - **Property 2: Excel 报告结构完整性**
    - **验证: 需求 2.2, 2.3, 2.4**

- [ ] 5. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

- [ ] 6. 实现 ReportService 和 API 端点
  - [ ] 6.1 实现 ReportService 类
    - 实现 generatePDF 方法，调用 PDFGenerator
    - 实现 generateExcel 方法，调用 ExcelGenerator
    - _需求: 1.1, 2.1_

  - [ ] 6.2 创建报告控制器
    - 创建 `src/controllers/reportController.js`
    - 实现 exportPDF 方法
    - 实现 exportExcel 方法
    - _需求: 5.1, 5.2_

  - [ ] 6.3 添加 API 路由
    - 在 `src/routes/api.js` 中添加路由
    - GET /api/history/:id/export/pdf
    - GET /api/history/:id/export/excel
    - 设置正确的 Content-Type 和 Content-Disposition
    - _需求: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. 实现前端导出功能
  - [ ] 7.1 在历史详情页添加导出按钮
    - 修改 `public/detail.html`
    - 添加"导出 PDF"和"导出 Excel"按钮
    - _需求: 1.1, 2.1_

  - [ ] 7.2 实现导出功能和用户反馈
    - 实现点击按钮触发下载
    - 添加加载指示器
    - 添加成功/失败提示
    - _需求: 3.3, 4.1, 4.2, 4.3_

- [ ] 8. 更新 Swagger 文档
  - [ ] 8.1 添加导出 API 文档
    - 在 `src/swagger.js` 中添加导出端点文档
    - _需求: 5.1, 5.2_

- [ ] 9. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户
