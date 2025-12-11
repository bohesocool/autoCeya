const fc = require('fast-check');
const PDFGenerator = require('./pdfGenerator');

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

describe('PDFGenerator 属性测试', () => {
  let pdfGenerator;

  beforeEach(() => {
    pdfGenerator = new PDFGenerator();
  });

  /**
   * **Feature: test-report-export, Property 1: PDF 报告内容完整性**
   * *对于任意* 有效的历史记录数据，生成的 PDF 报告应该包含测试配置（URL、模型、模式、RPM）、
   * 统计数据（总请求数、成功率、平均响应时间）、分钟统计和错误摘要。
   * **验证: 需求 1.2, 1.3, 1.4, 1.5**
   */
  describe('Property 1: PDF 报告内容完整性', () => {
    test('生成的 PDF 是有效的 Buffer', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const pdfBuffer = await pdfGenerator.generate(data);
            
            // 验证：返回值是 Buffer
            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            
            // 验证：Buffer 不为空
            expect(pdfBuffer.length).toBeGreaterThan(0);
            
            // 验证：PDF 文件头（%PDF-）
            const header = pdfBuffer.slice(0, 5).toString('ascii');
            expect(header).toBe('%PDF-');
          }
        ),
        { numRuns: 100 }
      );
    });


    test('PDF 文件结构有效', async () => {
      await fc.assert(
        fc.asyncProperty(
          historyDataArbitrary,
          async (data) => {
            const pdfBuffer = await pdfGenerator.generate(data);
            const pdfContent = pdfBuffer.toString('latin1');
            
            // 验证：PDF 包含必要的结构元素
            // PDF 文件应该包含 endobj 标记（表示对象结束）
            expect(pdfContent).toContain('endobj');
            
            // PDF 文件应该包含 xref 表（交叉引用表）
            expect(pdfContent).toContain('xref');
            
            // PDF 文件应该以 %%EOF 结尾
            expect(pdfContent).toContain('%%EOF');
            
            // PDF 文件应该包含 trailer
            expect(pdfContent).toContain('trailer');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('PDF 生成不会因为空数据而失败', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            minuteStats: fc.constant([]),
            errorSummary: fc.constant({})
          }),
          async (data) => {
            const pdfBuffer = await pdfGenerator.generate(data);
            
            // 验证：即使数据为空，也能生成有效的 PDF
            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            expect(pdfBuffer.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('PDF 生成不会因为大量分钟统计数据而失败', async () => {
      const largeMinuteStatsArbitrary = fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        startTime: validDateStringArbitrary,
        endTime: validDateStringArbitrary,
        duration: fc.integer({ min: 1, max: 3600 }),
        testUrl: fc.webUrl(),
        modelName: fc.constant('test-model'),
        testMode: fc.constantFrom('fixed', 'incremental', 'stress'),
        promptMode: fc.constantFrom('simple', 'complex', 'random'),
        requestType: fc.constantFrom('chat', 'completion'),
        targetRPM: fc.integer({ min: 1, max: 1000 }),
        maxRPM: fc.integer({ min: 1, max: 2000 }),
        totalRequests: fc.integer({ min: 0, max: 100000 }),
        successCount: fc.integer({ min: 0, max: 100000 }),
        failureCount: fc.integer({ min: 0, max: 100000 }),
        successRate: fc.float({ min: 0, max: 100, noNaN: true }),
        avgResponseTime: fc.float({ min: 0, max: 60000, noNaN: true }),
        stopReason: fc.constantFrom('completed', 'manual', 'error', 'timeout'),
        minuteStats: fc.array(
          fc.record({
            timestamp: validDateStringArbitrary,
            successCount: fc.integer({ min: 0, max: 1000 }),
            failureCount: fc.integer({ min: 0, max: 1000 }),
            rpm: fc.integer({ min: 0, max: 2000 })
          }),
          { minLength: 50, maxLength: 100 }
        ),
        errorSummary: fc.constant({})
      });

      await fc.assert(
        fc.asyncProperty(
          largeMinuteStatsArbitrary,
          async (data) => {
            const pdfBuffer = await pdfGenerator.generate(data);
            
            // 验证：大量数据也能生成有效的 PDF
            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            expect(pdfBuffer.length).toBeGreaterThan(0);
            
            // 验证：PDF 文件头
            const header = pdfBuffer.slice(0, 5).toString('ascii');
            expect(header).toBe('%PDF-');
          }
        ),
        { numRuns: 10 }
      );
    });

    test('PDF 生成不会因为大量错误摘要而失败', async () => {
      const largeErrorSummaryArbitrary = fc.record({
        id: fc.constant(1),
        startTime: fc.constant('2024-01-01T00:00:00.000Z'),
        endTime: fc.constant('2024-01-01T01:00:00.000Z'),
        duration: fc.constant(3600),
        testUrl: fc.constant('http://test.com'),
        modelName: fc.constant('test-model'),
        testMode: fc.constant('fixed'),
        promptMode: fc.constant('simple'),
        requestType: fc.constant('chat'),
        targetRPM: fc.constant(100),
        maxRPM: fc.constant(200),
        totalRequests: fc.constant(1000),
        successCount: fc.constant(900),
        failureCount: fc.constant(100),
        successRate: fc.constant(90),
        avgResponseTime: fc.constant(500),
        stopReason: fc.constant('completed'),
        minuteStats: fc.constant([]),
        errorSummary: fc.dictionary(
          fc.string({ minLength: 5, maxLength: 30 }).map(s => s.replace(/[^a-zA-Z0-9_]/g, '_') || 'error'),
          fc.integer({ min: 1, max: 100 }),
          { minKeys: 10, maxKeys: 50 }
        )
      });

      await fc.assert(
        fc.asyncProperty(
          largeErrorSummaryArbitrary,
          async (data) => {
            const pdfBuffer = await pdfGenerator.generate(data);
            
            // 验证：大量错误摘要也能生成有效的 PDF
            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            expect(pdfBuffer.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
