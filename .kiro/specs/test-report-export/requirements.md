# 需求文档

## 简介

本功能为 AutoCeya 压力测试系统添加测试报告导出功能，支持将测试结果导出为 PDF 和 Excel 格式，方便用户保存、分享和分析测试数据。

## 术语表

- **测试报告 (Test Report)**: 包含测试配置、统计数据、趋势图表等信息的文档
- **PDF**: 便携式文档格式，适合打印和分享
- **Excel**: 电子表格格式，适合数据分析和二次处理
- **历史记录 (History)**: 存储在数据库中的已完成测试数据

## 需求

### 需求 1

**用户故事:** 作为测试人员，我希望能够将测试结果导出为 PDF 格式，以便我可以打印或分享给团队成员。

#### 验收标准

1. WHEN 用户在历史记录详情页点击"导出 PDF"按钮 THEN 系统 SHALL 生成包含测试摘要的 PDF 文件
2. WHEN PDF 报告生成时 THEN 系统 SHALL 包含测试配置信息（URL、模型、模式、RPM）
3. WHEN PDF 报告生成时 THEN 系统 SHALL 包含统计数据（总请求数、成功率、平均响应时间）
4. WHEN PDF 报告生成时 THEN 系统 SHALL 包含每分钟统计数据表格
5. WHEN PDF 报告生成时 THEN 系统 SHALL 包含错误摘要信息

### 需求 2

**用户故事:** 作为数据分析师，我希望能够将测试结果导出为 Excel 格式，以便我可以进行进一步的数据分析。

#### 验收标准

1. WHEN 用户在历史记录详情页点击"导出 Excel"按钮 THEN 系统 SHALL 生成包含测试数据的 Excel 文件
2. WHEN Excel 报告生成时 THEN 系统 SHALL 创建"测试摘要"工作表，包含基本配置和统计
3. WHEN Excel 报告生成时 THEN 系统 SHALL 创建"分钟统计"工作表，包含每分钟的详细数据
4. WHEN Excel 报告生成时 THEN 系统 SHALL 创建"错误详情"工作表，包含错误类型和数量
5. WHEN Excel 文件生成时 THEN 系统 SHALL 使用适当的列宽和格式化

### 需求 3

**用户故事:** 作为用户，我希望导出的文件名包含有意义的信息，以便我可以轻松识别和管理报告文件。

#### 验收标准

1. WHEN 导出报告时 THEN 系统 SHALL 使用格式 `autoceya_report_{模型名}_{日期时间}.{扩展名}` 命名文件
2. WHEN 文件名包含特殊字符 THEN 系统 SHALL 将特殊字符替换为下划线
3. WHEN 导出完成时 THEN 系统 SHALL 自动触发浏览器下载

### 需求 4

**用户故事:** 作为用户，我希望在导出过程中看到进度提示，以便我知道系统正在处理我的请求。

#### 验收标准

1. WHEN 用户点击导出按钮 THEN 系统 SHALL 显示加载指示器
2. WHEN 导出成功完成 THEN 系统 SHALL 显示成功提示消息
3. WHEN 导出失败 THEN 系统 SHALL 显示错误提示消息并说明原因

### 需求 5

**用户故事:** 作为开发者，我希望导出功能通过 API 提供，以便可以集成到自动化流程中。

#### 验收标准

1. WHEN 调用 GET /api/history/:id/export/pdf THEN 系统 SHALL 返回 PDF 文件流
2. WHEN 调用 GET /api/history/:id/export/excel THEN 系统 SHALL 返回 Excel 文件流
3. WHEN 请求的历史记录不存在 THEN 系统 SHALL 返回 404 错误
4. WHEN 导出过程发生错误 THEN 系统 SHALL 返回 500 错误并包含错误信息
