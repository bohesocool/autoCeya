const fc = require('fast-check');
const ReportService = require('./reportService');

describe('ReportService 属性测试', () => {
  let reportService;

  beforeEach(() => {
    reportService = new ReportService();
  });

  /**
   * **Feature: test-report-export, Property 3: 文件名格式正确性**
   * *对于任意* 模型名称和日期时间，生成的文件名应该符合格式
   * `autoceya_report_{模型名}_{日期时间}.{扩展名}`，且特殊字符被替换为下划线。
   * **验证: 需求 3.1, 3.2**
   */
  describe('Property 3: 文件名格式正确性', () => {
    test('生成的文件名符合指定格式', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),  // 模型名称（可能包含特殊字符）
          fc.constantFrom('pdf', 'xlsx'),               // 文件格式
          fc.date({
            min: new Date('2020-01-01'),
            max: new Date('2030-12-31')
          }),                                           // 日期
          (modelName, format, date) => {
            const fileName = reportService.generateFileName(modelName, format, date);
            
            // 验证：文件名以 autoceya_report_ 开头
            expect(fileName.startsWith('autoceya_report_')).toBe(true);
            
            // 验证：文件名以正确的扩展名结尾
            expect(fileName.endsWith(`.${format}`)).toBe(true);
            
            // 验证：文件名格式为 autoceya_report_{模型名}_{日期时间}.{扩展名}
            const pattern = /^autoceya_report_[a-zA-Z0-9\u4e00-\u9fa5_-]+_\d{8}_\d{6}\.(pdf|xlsx)$/;
            // 如果模型名为空或只有特殊字符，sanitizeFileName 会返回 'unknown'
            const patternWithUnknown = /^autoceya_report_(unknown|[a-zA-Z0-9\u4e00-\u9fa5_-]+)_\d{8}_\d{6}\.(pdf|xlsx)$/;
            expect(fileName).toMatch(patternWithUnknown);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('特殊字符被正确替换为下划线', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),  // 模型名称
          (modelName) => {
            const sanitized = reportService.sanitizeFileName(modelName);
            
            // 验证：结果不包含特殊字符（只允许字母、数字、中文、连字符、下划线）
            // 注意：sanitizeFileName 返回的结果不应该有首尾下划线
            const validPattern = /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$|^unknown$/;
            expect(sanitized).toMatch(validPattern);
            
            // 验证：不包含连续的下划线
            expect(sanitized).not.toMatch(/__+/);
            
            // 验证：不以下划线开头或结尾
            expect(sanitized).not.toMatch(/^_|_$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('日期时间格式正确', () => {
      fc.assert(
        fc.property(
          fc.date({
            min: new Date('2020-01-01'),
            max: new Date('2030-12-31')
          }).filter(d => !isNaN(d.getTime())),  // 过滤掉无效日期
          (date) => {
            const fileName = reportService.generateFileName('test', 'pdf', date);
            
            // 提取日期时间部分
            const match = fileName.match(/autoceya_report_test_(\d{8}_\d{6})\.pdf/);
            expect(match).not.toBeNull();
            
            const dateTimePart = match[1];
            const [datePart, timePart] = dateTimePart.split('_');
            
            // 验证日期部分
            const year = parseInt(datePart.substring(0, 4));
            const month = parseInt(datePart.substring(4, 6));
            const day = parseInt(datePart.substring(6, 8));
            
            expect(year).toBe(date.getFullYear());
            expect(month).toBe(date.getMonth() + 1);
            expect(day).toBe(date.getDate());
            
            // 验证时间部分
            const hours = parseInt(timePart.substring(0, 2));
            const minutes = parseInt(timePart.substring(2, 4));
            const seconds = parseInt(timePart.substring(4, 6));
            
            expect(hours).toBe(date.getHours());
            expect(minutes).toBe(date.getMinutes());
            expect(seconds).toBe(date.getSeconds());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('空字符串或 null 输入返回 unknown', () => {
      // 测试边界情况
      expect(reportService.sanitizeFileName('')).toBe('unknown');
      expect(reportService.sanitizeFileName(null)).toBe('unknown');
      expect(reportService.sanitizeFileName(undefined)).toBe('unknown');
      expect(reportService.sanitizeFileName('   ')).toBe('unknown');
      expect(reportService.sanitizeFileName('***')).toBe('unknown');
    });
  });
});
