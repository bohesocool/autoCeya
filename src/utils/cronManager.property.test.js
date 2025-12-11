/**
 * CronManager 属性测试
 * 使用 fast-check 进行属性测试
 * 
 * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
 * **验证: 需求 1.3**
 */
const fc = require('fast-check');
const cronManager = require('./cronManager');

/**
 * 生成有效的 cron 字段值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {fc.Arbitrary<string>} fast-check 生成器
 */
function cronFieldArbitrary(min, max) {
  return fc.oneof(
    // 通配符
    fc.constant('*'),
    // 精确值
    fc.integer({ min, max }).map(n => n.toString()),
    // 步进值 (*/n)
    fc.integer({ min: 1, max: Math.floor((max - min) / 2) + 1 }).map(n => `*/${n}`),
    // 范围 (a-b)
    fc.tuple(
      fc.integer({ min, max }),
      fc.integer({ min, max })
    ).filter(([a, b]) => a < b).map(([a, b]) => `${a}-${b}`),
    // 列表 (a,b,c)
    fc.array(fc.integer({ min, max }), { minLength: 2, maxLength: 4 })
      .map(arr => [...new Set(arr)].sort((a, b) => a - b).join(','))
  );
}

/**
 * 生成有效的 5 字段 cron 表达式
 * 格式: 分钟 小时 日 月 星期
 * 
 * 注意：为了避免生成不可能的日期组合（如4月31日），
 * 我们使用保守的日期范围（1-28），确保所有月份都有效
 */
const validCronArbitrary = fc.tuple(
  cronFieldArbitrary(0, 59),  // 分钟
  cronFieldArbitrary(0, 23),  // 小时
  cronFieldArbitrary(1, 28),  // 日（使用 1-28 确保所有月份都有效）
  cronFieldArbitrary(1, 12),  // 月
  cronFieldArbitrary(0, 6)    // 星期
).map(parts => parts.join(' '));

/**
 * 生成无效的 cron 表达式
 * 注意：node-cron 接受星期 0-7（0 和 7 都表示星期日）
 * 注意：node-cron 也接受 6 字段格式（包含秒）
 */
const invalidCronArbitrary = fc.oneof(
  // 空字符串
  fc.constant(''),
  // null 和 undefined 类型
  fc.constant(null),
  fc.constant(undefined),
  // 字段数量不对（太少）
  fc.constant('* * *'),
  fc.constant('* *'),
  fc.constant('*'),
  // 无效的分钟值
  fc.constant('60 * * * *'),
  fc.constant('70 * * * *'),
  // 无效的小时值
  fc.constant('* 24 * * *'),
  fc.constant('* 25 * * *'),
  // 无效的日期值
  fc.constant('* * 32 * *'),
  fc.constant('* * 0 * *'),
  // 无效的月份值
  fc.constant('* * * 13 *'),
  fc.constant('* * * 0 *'),
  // 无效的星期值（8 及以上）
  fc.constant('* * * * 8'),
  // 包含非法字符
  fc.constant('* * * * abc'),
  fc.constant('a b c d e'),
  fc.constant('hello world')
);

describe('CronManager 属性测试', () => {
  
  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于任意有效的 Cron 表达式，validateCron 应返回 true
   */
  test('属性 2: 有效的 Cron 表达式应通过验证', async () => {
    await fc.assert(
      fc.property(
        validCronArbitrary,
        (cronExpression) => {
          const isValid = cronManager.validateCron(cronExpression);
          
          // 有效的 cron 表达式应该返回 true
          expect(isValid).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于任意无效的 Cron 表达式，validateCron 应返回 false
   */
  test('属性 2: 无效的 Cron 表达式应验证失败', async () => {
    await fc.assert(
      fc.property(
        invalidCronArbitrary,
        (cronExpression) => {
          const isValid = cronManager.validateCron(cronExpression);
          
          // 无效的 cron 表达式应该返回 false
          expect(isValid).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于任意有效的 Cron 表达式，getNextRunTime 返回的时间应该在未来
   */
  test('属性 2: getNextRunTime 返回的时间应在未来', async () => {
    await fc.assert(
      fc.property(
        validCronArbitrary,
        (cronExpression) => {
          const nextRunTime = cronManager.getNextRunTime(cronExpression);
          const now = new Date();
          
          // 有效的 cron 表达式应该返回一个 Date 对象
          expect(nextRunTime).toBeInstanceOf(Date);
          
          // 返回的时间应该在当前时间之后
          expect(nextRunTime.getTime()).toBeGreaterThan(now.getTime());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于无效的 Cron 表达式，getNextRunTime 应返回 null
   */
  test('属性 2: 无效表达式的 getNextRunTime 应返回 null', async () => {
    await fc.assert(
      fc.property(
        invalidCronArbitrary,
        (cronExpression) => {
          const nextRunTime = cronManager.getNextRunTime(cronExpression);
          
          // 无效的 cron 表达式应该返回 null
          expect(nextRunTime).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于每分钟执行的表达式 "* * * * *"，下次执行时间应在 1 分钟内
   */
  test('属性 2: 每分钟执行的表达式下次执行应在 1 分钟内', () => {
    const cronExpression = '* * * * *';
    const nextRunTime = cronManager.getNextRunTime(cronExpression);
    const now = new Date();
    
    expect(nextRunTime).toBeInstanceOf(Date);
    
    // 下次执行时间应该在 1 分钟内
    const diffMs = nextRunTime.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThanOrEqual(60 * 1000);
  });

  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于特定分钟的表达式，下次执行时间的分钟应匹配
   */
  test('属性 2: 特定分钟表达式的下次执行时间分钟应匹配', async () => {
    await fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 59 }),
        (minute) => {
          const cronExpression = `${minute} * * * *`;
          const nextRunTime = cronManager.getNextRunTime(cronExpression);
          
          expect(nextRunTime).toBeInstanceOf(Date);
          expect(nextRunTime.getMinutes()).toBe(minute);
          
          return true;
        }
      ),
      { numRuns: 60 }
    );
  });

  /**
   * **Feature: advanced-features, Property 2: Cron 表达式解析正确性**
   * **验证: 需求 1.3**
   * 
   * 属性：对于特定小时的表达式，下次执行时间的小时应匹配
   */
  test('属性 2: 特定小时表达式的下次执行时间小时应匹配', async () => {
    await fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        (hour) => {
          const cronExpression = `0 ${hour} * * *`;
          const nextRunTime = cronManager.getNextRunTime(cronExpression);
          
          expect(nextRunTime).toBeInstanceOf(Date);
          expect(nextRunTime.getHours()).toBe(hour);
          expect(nextRunTime.getMinutes()).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 24 }
    );
  });
});
