/**
 * 验证器属性测试
 * 使用 fast-check 进行属性测试
 */
const fc = require('fast-check');
const { validateSuccessThreshold, validateMaxFailures } = require('./validator');

describe('阈值参数验证', () => {
  /**
   * **Feature: frontend-threshold-config, Property 3: 成功率阈值范围验证**
   * **验证: 需求 2.2, 6.1**
   * 
   * 对于任意成功率阈值输入值，验证函数应接受0-100范围内的值，拒绝范围外的值
   */
  describe('Property 3: 成功率阈值范围验证', () => {
    test('应接受0-100范围内的任意数值', () => {
      fc.assert(
        fc.property(
          // 生成0-100范围内的数值（包括整数和小数）
          fc.double({ min: 0, max: 100, noNaN: true }),
          (value) => {
            const result = validateSuccessThreshold(value);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝小于0的任意数值', () => {
      fc.assert(
        fc.property(
          // 生成小于0的数值
          fc.double({ max: -0.001, noNaN: true }),
          (value) => {
            const result = validateSuccessThreshold(value);
            return result.valid === false && result.error === '成功率阈值必须在0-100之间';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝大于100的任意数值', () => {
      fc.assert(
        fc.property(
          // 生成大于100的数值
          fc.double({ min: 100.001, noNaN: true }),
          (value) => {
            const result = validateSuccessThreshold(value);
            return result.valid === false && result.error === '成功率阈值必须在0-100之间';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝NaN值', () => {
      const result = validateSuccessThreshold(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('成功率阈值必须在0-100之间');
    });

    test('应拒绝非数字字符串', () => {
      fc.assert(
        fc.property(
          // 生成非数字字符串
          fc.string().filter(s => isNaN(Number(s))),
          (value) => {
            const result = validateSuccessThreshold(value);
            return result.valid === false && result.error === '成功率阈值必须在0-100之间';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应接受undefined和null值（可选参数）', () => {
      expect(validateSuccessThreshold(undefined).valid).toBe(true);
      expect(validateSuccessThreshold(null).valid).toBe(true);
    });

    test('应接受数字字符串形式的有效值', () => {
      fc.assert(
        fc.property(
          // 生成0-100范围内的整数，转为字符串
          fc.integer({ min: 0, max: 100 }),
          (value) => {
            const result = validateSuccessThreshold(String(value));
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: frontend-threshold-config, Property 4: 最大失败次数验证**
   * **验证: 需求 2.3, 6.2**
   * 
   * 对于任意最大连续失败次数输入值，验证函数应接受非负整数，拒绝负数和非整数
   */
  describe('Property 4: 最大失败次数验证', () => {
    test('应接受任意非负整数', () => {
      fc.assert(
        fc.property(
          // 生成非负整数（0到安全整数最大值）
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          (value) => {
            const result = validateMaxFailures(value);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝任意负整数', () => {
      fc.assert(
        fc.property(
          // 生成负整数
          fc.integer({ min: Number.MIN_SAFE_INTEGER, max: -1 }),
          (value) => {
            const result = validateMaxFailures(value);
            return result.valid === false && result.error === '最大连续失败次数必须为非负整数';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝任意负小数', () => {
      fc.assert(
        fc.property(
          // 生成负小数
          fc.double({ max: -0.001, noNaN: true }),
          (value) => {
            const result = validateMaxFailures(value);
            return result.valid === false && result.error === '最大连续失败次数必须为非负整数';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝任意正小数（非整数）', () => {
      fc.assert(
        fc.property(
          // 生成正小数（非整数）
          fc.double({ min: 0.001, max: 1000000, noNaN: true }).filter(v => !Number.isInteger(v)),
          (value) => {
            const result = validateMaxFailures(value);
            return result.valid === false && result.error === '最大连续失败次数必须为非负整数';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝NaN值', () => {
      const result = validateMaxFailures(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('最大连续失败次数必须为非负整数');
    });

    test('应拒绝非数字字符串', () => {
      fc.assert(
        fc.property(
          // 生成非数字字符串
          fc.string().filter(s => isNaN(Number(s))),
          (value) => {
            const result = validateMaxFailures(value);
            return result.valid === false && result.error === '最大连续失败次数必须为非负整数';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应接受undefined和null值（可选参数）', () => {
      expect(validateMaxFailures(undefined).valid).toBe(true);
      expect(validateMaxFailures(null).valid).toBe(true);
    });

    test('应接受数字字符串形式的有效非负整数', () => {
      fc.assert(
        fc.property(
          // 生成非负整数，转为字符串
          fc.integer({ min: 0, max: 10000 }),
          (value) => {
            const result = validateMaxFailures(String(value));
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应拒绝数字字符串形式的小数', () => {
      fc.assert(
        fc.property(
          // 生成正小数，转为字符串
          fc.double({ min: 0.1, max: 1000, noNaN: true }).filter(v => !Number.isInteger(v)),
          (value) => {
            const result = validateMaxFailures(String(value));
            return result.valid === false && result.error === '最大连续失败次数必须为非负整数';
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
