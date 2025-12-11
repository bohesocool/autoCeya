const fc = require('fast-check');
const SlidingWindowStats = require('./slidingWindowStats');

describe('SlidingWindowStats 属性测试', () => {
  /**
   * **Feature: performance-optimization, Property 6: 滑动窗口平均值一致性**
   * *对于任意* 滑动窗口统计和数值序列，getAverage() 返回的值应该等于
   * 窗口内所有值的算术平均值。
   * **验证: 需求 2.1**
   */
  test('Property 6: 滑动窗口平均值一致性 - 平均值等于窗口内值的算术平均值', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // 窗口大小
        fc.array(fc.integer({ min: -10000, max: 10000 }), { minLength: 1 }), // 数值序列
        (windowSize, values) => {
          const stats = new SlidingWindowStats(windowSize);
          
          // 添加所有值
          for (const value of values) {
            stats.add(value);
          }
          
          // 计算预期的窗口内值
          // 窗口内应该包含最后 windowSize 个值（或全部值如果不足）
          const windowValues = values.slice(-windowSize);
          const expectedSum = windowValues.reduce((a, b) => a + b, 0);
          const expectedAverage = expectedSum / windowValues.length;
          
          // 验证：平均值计算正确（考虑浮点数精度）
          expect(stats.getAverage()).toBeCloseTo(expectedAverage, 10);
          // 验证：总和计算正确
          expect(stats.getSum()).toBeCloseTo(expectedSum, 10);
          // 验证：计数正确
          expect(stats.count).toBe(windowValues.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 补充测试：空窗口返回 0
   */
  test('Property 6 补充: 空窗口平均值为 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // 窗口大小
        (windowSize) => {
          const stats = new SlidingWindowStats(windowSize);
          
          // 验证：空窗口平均值为 0
          expect(stats.getAverage()).toBe(0);
          expect(stats.getSum()).toBe(0);
          expect(stats.count).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 补充测试：重置后状态正确
   */
  test('Property 6 补充: reset 后窗口恢复初始状态', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // 窗口大小
        fc.array(fc.integer({ min: -10000, max: 10000 }), { minLength: 1 }), // 数值序列
        (windowSize, values) => {
          const stats = new SlidingWindowStats(windowSize);
          
          // 添加值
          for (const value of values) {
            stats.add(value);
          }
          
          // 重置
          stats.reset();
          
          // 验证：重置后状态正确
          expect(stats.getAverage()).toBe(0);
          expect(stats.getSum()).toBe(0);
          expect(stats.count).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
