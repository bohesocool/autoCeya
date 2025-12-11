const fc = require('fast-check');
const ExcelJS = require('exceljs');
const ExcelGenerator = require('./excelGenerator');

/**
 * 生成有效日期字符串的 arbitrary
 */
const validDateStringArbitrary = fc.integer({ min: 2020, max: 2030 })
  .chain(year => fc.integer({ min: 1, max: 12 })
    .chain(month => fc.integer({ min: 1, max: 28 })
      .chain(day => fc.integer({ min: 0, max: 23 })
        .chain(hour => fc.integer({ min: 0, max: 59 })
          .chain(minute => fc.integer({ min: 0, max: 59 })
            .map(second => {
              const d = new Date(year, month - 1, day, hour, minute, second);
              return d.toISOString();
            })
          )
        )
      )
    )
  );

/**
 * 生成有效的历史记录数据的 arbitrary
 */
const historyDataArbitrary = fc.record({
  // 基本信息
  id: fc.integer({ min: 1, max: 10000 }),
  startTime: validDateStringArbitrary,
  endTime: validDateStringArbitrary,
  duration: fc.integer({ min: 1, max: 3600 }),
  
  // 测试配置
  testUrl: fc.webUrl(),
  modelName: fc.string({ minLength: 1, maxLength: 30 }).map(s => s.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 30) || 'model'),
  testMode: fc.constantFrom('fixed', 'incremental', 'stress'),
  promptMode: fc.constantFrom('simple', 'complex', 'random'),
  requestType: fc.constantFrom('chat', 'completion'),
  targetRPM: fc.integer({ min: 1, max: 1000 }),
  maxRPM: fc.integer({ min: 1, max: 2000 }),
  
  // 统计数据
  totalRequests: fc.integer({ min: 0, max: 100000 }),
  successCount: fc.integer({ min: 0, max: 100000 }),
  failureCount: fc.integer({ min: 0, max: 100000 }),
  successRate: fc.float({ min: 0, max: 100, noNaN: true }),
  avgResponseTime: fc.float({ min: 0, max: 60000, noNaN: true }),
  stopReason: fc.constantFrom('completed', 'manual', 'error', 'timeout'),
  
  // 分钟统计
  minuteStats: fc.array(
    fc.record({
      timestamp: validDateStringArbitrary,
      successCount: fc.integer({ min: 0, max: 1000 }),
      failureCount: fc.integer({ min: 0, max: 1000 }),
      rpm: fc.integer({ min: 0, max: 2000 })
    }),
    { minLength: 0, maxLength: 10 }
  ),
  
  // 错误摘要
  errorSummary: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20) || 'error'),
    fc.integer({ min: 1, max: 100 })
  )
});

describe('ExcelGenerator 属性测试', () => {
  let excelGenerator;

  beforeEach(() => {
    excelGenerator = new ExcelGenerator();
  });

  /**
   * **Feature: test-report-export, Property 2: Excel 报告结构完整性**
   * *对于任意* 有效的历史记录数据，生成的 Excel 文件应该包含三个工作表：
   * 测试摘要、分钟统计、错误详情，且每个工作表包含正确的数据。
   * **验证: 需求 2.2, 2.3, 2.4**
   */
  describe('Property 2: Excel 报告结构完整性', () => {
    test('生成的 Excel 是有效的 Buffer', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            // 验证：返回值是 Buffer
            expect(Buffer.isBuffer(excelBuffer)).toBe(true);
            
            // 验证：Buffer 不为空
            expect(excelBuffer.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Excel 文件包含三个必需的工作表', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            // 解析生成的 Excel 文件
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            
            // 验证：工作表数量为 3
            expect(workbook.worksheets.length).toBe(3);
            
            // 验证：工作表名称正确
            const sheetNames = workbook.worksheets.map(ws => ws.name);
            expect(sheetNames).toContain('测试摘要');
            expect(sheetNames).toContain('分钟统计');
            expect(sheetNames).toContain('错误详情');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('测试摘要工作表包含正确的列结构', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            
            const summarySheet = workbook.getWorksheet('测试摘要');
            expect(summarySheet).toBeDefined();
            
            // 验证：表头存在
            const headerRow = summarySheet.getRow(1);
            expect(headerRow.getCell(1).value).toBe('项目');
            expect(headerRow.getCell(2).value).toBe('值');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('分钟统计工作表包含正确的列结构', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            
            const minuteStatsSheet = workbook.getWorksheet('分钟统计');
            expect(minuteStatsSheet).toBeDefined();
            
            // 验证：表头存在
            const headerRow = minuteStatsSheet.getRow(1);
            expect(headerRow.getCell(1).value).toBe('时间');
            expect(headerRow.getCell(2).value).toBe('成功数');
            expect(headerRow.getCell(3).value).toBe('失败数');
            expect(headerRow.getCell(4).value).toBe('RPM');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('错误详情工作表包含正确的列结构', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            
            const errorSheet = workbook.getWorksheet('错误详情');
            expect(errorSheet).toBeDefined();
            
            // 验证：表头存在
            const headerRow = errorSheet.getRow(1);
            expect(headerRow.getCell(1).value).toBe('错误类型');
            expect(headerRow.getCell(2).value).toBe('数量');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('分钟统计数据行数与输入数据匹配', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            
            const minuteStatsSheet = workbook.getWorksheet('分钟统计');
            
            // 行数 = 表头行 + 数据行
            const expectedRows = 1 + (data.minuteStats ? data.minuteStats.length : 0);
            expect(minuteStatsSheet.rowCount).toBe(expectedRows);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('错误详情数据行数与输入数据匹配', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            
            const errorSheet = workbook.getWorksheet('错误详情');
            
            // 行数 = 表头行 + 数据行（如果没有错误，会有一行"无错误记录"）
            const errorCount = data.errorSummary ? Object.keys(data.errorSummary).length : 0;
            const expectedRows = 1 + (errorCount > 0 ? errorCount : 1);
            expect(errorSheet.rowCount).toBe(expectedRows);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Excel 生成不会因为空数据而失败', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            minuteStats: fc.constant([]),
            errorSummary: fc.constant({})
          }),
          async (data) => {
            const excelBuffer = await excelGenerator.generate(data);
            
            // 验证：即使数据为空，也能生成有效的 Excel
            expect(Buffer.isBuffer(excelBuffer)).toBe(true);
            expect(excelBuffer.length).toBeGreaterThan(0);
            
            // 验证：仍然包含三个工作表
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(excelBuffer);
            expect(workbook.worksheets.length).toBe(3);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
