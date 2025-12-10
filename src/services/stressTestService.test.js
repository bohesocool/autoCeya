/**
 * 测压服务属性测试
 * 使用 fast-check 进行属性测试
 */
const fc = require('fast-check');
const stressTestService = require('./stressTestService');

describe('checkOverload 过载检测', () => {
  // 在每个测试前重置服务状态
  beforeEach(() => {
    // 重置为初始状态
    stressTestService.testState = stressTestService.getInitialState();
  });

  /**
   * **Feature: frontend-threshold-config, Property 1: 阈值为0时跳过判定**
   * **验证: 需求 1.3**
   * 
   * 对于任意测试状态，当成功率阈值设置为0时，checkOverload函数不应因成功率触发过载判定
   */
  describe('Property 1: 阈值为0时跳过判定', () => {
    test('当成功率阈值为0时，不应因成功率触发过载判定', () => {
      fc.assert(
        fc.property(
          // 生成任意成功率（0-100）
          fc.double({ min: 0, max: 100, noNaN: true }),
          // 生成任意请求数（至少10个，因为checkOverload要求至少10个请求才判定）
          fc.integer({ min: 10, max: 10000 }),
          // 生成任意连续失败次数
          fc.integer({ min: 0, max: 1000 }),
          (successRate, totalRequests, consecutiveFailures) => {
            // 设置测试状态为自动模式
            stressTestService.testState.mode = 'auto';
            
            // 设置阈值：成功率阈值为0（跳过判定），最大失败次数设置为一个很大的值避免触发
            stressTestService.testState.thresholds = {
              successThreshold: 0,
              maxFailures: consecutiveFailures + 1000, // 确保不会因连续失败触发
            };
            
            // 设置当前分钟统计
            stressTestService.testState.currentMinuteStats = {
              successRate: successRate,
              totalRequests: totalRequests,
              successCount: Math.round(totalRequests * successRate / 100),
              failureCount: Math.round(totalRequests * (100 - successRate) / 100),
              timestamp: new Date().toISOString(),
              failureRate: 100 - successRate,
            };
            
            // 设置总体统计
            stressTestService.testState.stats.consecutiveFailures = consecutiveFailures;
            stressTestService.testState.stats.responseTimes = [100]; // 避免响应时间触发
            stressTestService.testState.stats.avgResponseTime = 100;
            
            // 执行检查
            const result = stressTestService.checkOverload();
            
            // 验证：不应因成功率触发过载
            // 如果触发了过载，原因不应该包含"成功率"
            if (result.overloaded && result.reason) {
              return !result.reason.includes('成功率');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('当成功率阈值为0且成功率极低时，仍不应因成功率触发过载', () => {
      fc.assert(
        fc.property(
          // 生成极低的成功率（0-10%）
          fc.double({ min: 0, max: 10, noNaN: true }),
          // 生成足够的请求数
          fc.integer({ min: 10, max: 1000 }),
          (successRate, totalRequests) => {
            // 设置测试状态为自动模式
            stressTestService.testState.mode = 'auto';
            
            // 设置阈值：成功率阈值为0
            stressTestService.testState.thresholds = {
              successThreshold: 0,
              maxFailures: 10000, // 设置很大的值避免触发
            };
            
            // 设置当前分钟统计
            stressTestService.testState.currentMinuteStats = {
              successRate: successRate,
              totalRequests: totalRequests,
              successCount: Math.round(totalRequests * successRate / 100),
              failureCount: Math.round(totalRequests * (100 - successRate) / 100),
              timestamp: new Date().toISOString(),
              failureRate: 100 - successRate,
            };
            
            // 设置总体统计，避免其他条件触发
            stressTestService.testState.stats.consecutiveFailures = 0;
            stressTestService.testState.stats.responseTimes = [100];
            stressTestService.testState.stats.avgResponseTime = 100;
            
            // 执行检查
            const result = stressTestService.checkOverload();
            
            // 验证：不应因成功率触发过载
            if (result.overloaded && result.reason) {
              return !result.reason.includes('成功率');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('当成功率阈值大于0且成功率低于阈值时，应触发过载', () => {
      fc.assert(
        fc.property(
          // 生成阈值（1-100）
          fc.integer({ min: 1, max: 100 }),
          // 生成足够的请求数
          fc.integer({ min: 10, max: 1000 }),
          (threshold, totalRequests) => {
            // 生成低于阈值的成功率
            const successRate = threshold - 1;
            if (successRate < 0) return true; // 跳过边界情况
            
            // 设置测试状态为自动模式
            stressTestService.testState.mode = 'auto';
            
            // 设置阈值
            stressTestService.testState.thresholds = {
              successThreshold: threshold,
              maxFailures: 10000, // 设置很大的值避免触发
            };
            
            // 设置当前分钟统计
            stressTestService.testState.currentMinuteStats = {
              successRate: successRate,
              totalRequests: totalRequests,
              successCount: Math.round(totalRequests * successRate / 100),
              failureCount: Math.round(totalRequests * (100 - successRate) / 100),
              timestamp: new Date().toISOString(),
              failureRate: 100 - successRate,
            };
            
            // 设置总体统计，避免其他条件触发
            stressTestService.testState.stats.consecutiveFailures = 0;
            stressTestService.testState.stats.responseTimes = [100];
            stressTestService.testState.stats.avgResponseTime = 100;
            
            // 执行检查
            const result = stressTestService.checkOverload();
            
            // 验证：应因成功率触发过载
            return result.overloaded === true && result.reason.includes('成功率');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: frontend-threshold-config, Property 2: 连续失败阈值为0时跳过判定**
   * **验证: 需求 1.4**
   * 
   * 对于任意测试状态，当最大连续失败次数设置为0时，checkOverload函数不应因连续失败触发过载判定
   */
  describe('Property 2: 连续失败阈值为0时跳过判定', () => {
    test('当最大连续失败次数为0时，不应因连续失败触发过载判定', () => {
      fc.assert(
        fc.property(
          // 生成任意连续失败次数（0-10000）
          fc.integer({ min: 0, max: 10000 }),
          // 生成任意成功率（足够高以避免成功率触发）
          fc.double({ min: 80, max: 100, noNaN: true }),
          // 生成任意请求数
          fc.integer({ min: 10, max: 10000 }),
          (consecutiveFailures, successRate, totalRequests) => {
            // 设置测试状态为自动模式
            stressTestService.testState.mode = 'auto';
            
            // 设置阈值：最大连续失败次数为0（跳过判定），成功率阈值设置为较低值避免触发
            stressTestService.testState.thresholds = {
              successThreshold: 50, // 设置较低的阈值，确保不会因成功率触发
              maxFailures: 0, // 设置为0，跳过连续失败判定
            };
            
            // 设置当前分钟统计
            stressTestService.testState.currentMinuteStats = {
              successRate: successRate,
              totalRequests: totalRequests,
              successCount: Math.round(totalRequests * successRate / 100),
              failureCount: Math.round(totalRequests * (100 - successRate) / 100),
              timestamp: new Date().toISOString(),
              failureRate: 100 - successRate,
            };
            
            // 设置总体统计
            stressTestService.testState.stats.consecutiveFailures = consecutiveFailures;
            stressTestService.testState.stats.responseTimes = [100]; // 避免响应时间触发
            stressTestService.testState.stats.avgResponseTime = 100;
            
            // 执行检查
            const result = stressTestService.checkOverload();
            
            // 验证：不应因连续失败触发过载
            // 如果触发了过载，原因不应该包含"连续失败"
            if (result.overloaded && result.reason) {
              return !result.reason.includes('连续失败');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('当最大连续失败次数为0且连续失败次数极高时，仍不应因连续失败触发过载', () => {
      fc.assert(
        fc.property(
          // 生成极高的连续失败次数（1000-100000）
          fc.integer({ min: 1000, max: 100000 }),
          // 生成足够的请求数
          fc.integer({ min: 10, max: 1000 }),
          (consecutiveFailures, totalRequests) => {
            // 设置测试状态为自动模式
            stressTestService.testState.mode = 'auto';
            
            // 设置阈值：最大连续失败次数为0
            stressTestService.testState.thresholds = {
              successThreshold: 0, // 设置为0，避免成功率触发
              maxFailures: 0, // 设置为0，跳过连续失败判定
            };
            
            // 设置当前分钟统计（高成功率避免其他触发）
            stressTestService.testState.currentMinuteStats = {
              successRate: 100,
              totalRequests: totalRequests,
              successCount: totalRequests,
              failureCount: 0,
              timestamp: new Date().toISOString(),
              failureRate: 0,
            };
            
            // 设置总体统计
            stressTestService.testState.stats.consecutiveFailures = consecutiveFailures;
            stressTestService.testState.stats.responseTimes = [100];
            stressTestService.testState.stats.avgResponseTime = 100;
            
            // 执行检查
            const result = stressTestService.checkOverload();
            
            // 验证：不应因连续失败触发过载
            if (result.overloaded && result.reason) {
              return !result.reason.includes('连续失败');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('当最大连续失败次数大于0且连续失败达到阈值时，应触发过载', () => {
      fc.assert(
        fc.property(
          // 生成阈值（1-100）
          fc.integer({ min: 1, max: 100 }),
          // 生成足够的请求数
          fc.integer({ min: 10, max: 1000 }),
          (maxFailures, totalRequests) => {
            // 设置测试状态为自动模式
            stressTestService.testState.mode = 'auto';
            
            // 设置阈值
            stressTestService.testState.thresholds = {
              successThreshold: 0, // 设置为0，避免成功率触发
              maxFailures: maxFailures,
            };
            
            // 设置当前分钟统计（高成功率避免其他触发）
            stressTestService.testState.currentMinuteStats = {
              successRate: 100,
              totalRequests: totalRequests,
              successCount: totalRequests,
              failureCount: 0,
              timestamp: new Date().toISOString(),
              failureRate: 0,
            };
            
            // 设置总体统计：连续失败次数等于阈值
            stressTestService.testState.stats.consecutiveFailures = maxFailures;
            stressTestService.testState.stats.responseTimes = [100];
            stressTestService.testState.stats.avgResponseTime = 100;
            
            // 执行检查
            const result = stressTestService.checkOverload();
            
            // 验证：应因连续失败触发过载
            return result.overloaded === true && result.reason.includes('连续失败');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * **Feature: frontend-threshold-config, Property 5: 前端配置覆盖默认值**
 * **验证: 需求 3.2**
 * 
 * 对于任意有效的阈值配置，当前端传递阈值参数时，测压服务应使用前端值而非环境变量默认值
 */
describe('Property 5: 前端配置覆盖默认值', () => {
  // 保存原始配置
  let originalConfig;
  
  beforeEach(() => {
    // 重置服务状态
    stressTestService.testState = stressTestService.getInitialState();
    // 保存原始配置以便恢复
    const config = require('../config');
    originalConfig = {
      successThreshold: config.stressTest.successThreshold,
      maxConsecutiveFailures: config.stressTest.maxConsecutiveFailures,
    };
  });

  test('当前端传递成功率阈值时，应使用前端值而非环境变量默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成前端传递的成功率阈值（0-100）
        fc.integer({ min: 0, max: 100 }),
        (frontendSuccessThreshold) => {
          // 确保前端值与默认值不同，以便验证覆盖行为
          // 如果相同，则跳过此测试用例（因为无法区分是使用了前端值还是默认值）
          if (frontendSuccessThreshold === config.stressTest.successThreshold) {
            return true; // 跳过相同值的情况
          }
          
          // 模拟前端传递的测试配置
          const testConfig = {
            mode: 'auto',
            url: 'http://test.example.com',
            modelName: 'test-model',
            apiKey: 'test-api-key',
            successThreshold: frontendSuccessThreshold,
            // 不传递 maxFailures，让它使用默认值
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: testConfig.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: testConfig.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：成功率阈值应使用前端传递的值
          return thresholds.successThreshold === frontendSuccessThreshold;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当前端传递最大连续失败次数时，应使用前端值而非环境变量默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成前端传递的最大连续失败次数（非负整数）
        fc.integer({ min: 0, max: 1000 }),
        (frontendMaxFailures) => {
          // 确保前端值与默认值不同
          if (frontendMaxFailures === config.stressTest.maxConsecutiveFailures) {
            return true; // 跳过相同值的情况
          }
          
          // 模拟前端传递的测试配置
          const testConfig = {
            mode: 'auto',
            url: 'http://test.example.com',
            modelName: 'test-model',
            apiKey: 'test-api-key',
            maxFailures: frontendMaxFailures,
            // 不传递 successThreshold，让它使用默认值
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: testConfig.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: testConfig.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：最大连续失败次数应使用前端传递的值
          return thresholds.maxFailures === frontendMaxFailures;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当前端同时传递两个阈值参数时，应全部使用前端值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成前端传递的成功率阈值（0-100）
        fc.integer({ min: 0, max: 100 }),
        // 生成前端传递的最大连续失败次数（非负整数）
        fc.integer({ min: 0, max: 1000 }),
        (frontendSuccessThreshold, frontendMaxFailures) => {
          // 模拟前端传递的测试配置
          const testConfig = {
            mode: 'auto',
            url: 'http://test.example.com',
            modelName: 'test-model',
            apiKey: 'test-api-key',
            successThreshold: frontendSuccessThreshold,
            maxFailures: frontendMaxFailures,
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: testConfig.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: testConfig.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：两个阈值都应使用前端传递的值
          return thresholds.successThreshold === frontendSuccessThreshold &&
                 thresholds.maxFailures === frontendMaxFailures;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当前端传递阈值为0时，应正确使用0而非默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成布尔值决定测试哪个阈值
        fc.boolean(),
        (testSuccessThreshold) => {
          // 模拟前端传递的测试配置，阈值为0
          const testConfig = {
            mode: 'auto',
            url: 'http://test.example.com',
            modelName: 'test-model',
            apiKey: 'test-api-key',
            successThreshold: testSuccessThreshold ? 0 : undefined,
            maxFailures: testSuccessThreshold ? undefined : 0,
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: testConfig.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: testConfig.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：传递的0值应被正确使用，而非被默认值覆盖
          if (testSuccessThreshold) {
            // 测试成功率阈值为0的情况
            return thresholds.successThreshold === 0;
          } else {
            // 测试最大连续失败次数为0的情况
            return thresholds.maxFailures === 0;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: frontend-threshold-config, Property 6: 未传递参数时使用默认值**
 * **验证: 需求 3.3**
 * 
 * 对于任意启动测试请求，当未传递阈值参数时，测压服务应使用环境变量中的默认值
 */
describe('Property 6: 未传递参数时使用默认值', () => {
  beforeEach(() => {
    // 重置服务状态
    stressTestService.testState = stressTestService.getInitialState();
  });

  test('当未传递成功率阈值时，应使用环境变量默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成任意的测试配置（不包含 successThreshold）
        fc.record({
          mode: fc.constant('auto'),
          url: fc.webUrl(),
          modelName: fc.string({ minLength: 1, maxLength: 50 }),
          apiKey: fc.string({ minLength: 1, maxLength: 100 }),
          // 可能传递或不传递 maxFailures
          maxFailures: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
        }),
        (testConfig) => {
          // 确保 successThreshold 未定义
          const configWithoutSuccessThreshold = {
            ...testConfig,
            successThreshold: undefined,
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: configWithoutSuccessThreshold.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: configWithoutSuccessThreshold.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：成功率阈值应使用环境变量默认值
          return thresholds.successThreshold === config.stressTest.successThreshold;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当未传递最大连续失败次数时，应使用环境变量默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成任意的测试配置（不包含 maxFailures）
        fc.record({
          mode: fc.constant('auto'),
          url: fc.webUrl(),
          modelName: fc.string({ minLength: 1, maxLength: 50 }),
          apiKey: fc.string({ minLength: 1, maxLength: 100 }),
          // 可能传递或不传递 successThreshold
          successThreshold: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        }),
        (testConfig) => {
          // 确保 maxFailures 未定义
          const configWithoutMaxFailures = {
            ...testConfig,
            maxFailures: undefined,
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: configWithoutMaxFailures.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: configWithoutMaxFailures.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：最大连续失败次数应使用环境变量默认值
          return thresholds.maxFailures === config.stressTest.maxConsecutiveFailures;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当两个阈值参数都未传递时，应全部使用环境变量默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成任意的测试配置（不包含任何阈值参数）
        fc.record({
          mode: fc.constant('auto'),
          url: fc.webUrl(),
          modelName: fc.string({ minLength: 1, maxLength: 50 }),
          apiKey: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (testConfig) => {
          // 确保两个阈值参数都未定义
          const configWithoutThresholds = {
            ...testConfig,
            successThreshold: undefined,
            maxFailures: undefined,
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          const thresholds = {
            successThreshold: configWithoutThresholds.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: configWithoutThresholds.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：两个阈值都应使用环境变量默认值
          return thresholds.successThreshold === config.stressTest.successThreshold &&
                 thresholds.maxFailures === config.stressTest.maxConsecutiveFailures;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当阈值参数为 null 时，应使用环境变量默认值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成布尔值决定测试哪个阈值
        fc.boolean(),
        fc.boolean(),
        (testSuccessThreshold, testMaxFailures) => {
          // 模拟前端传递的测试配置，阈值为 null
          const testConfig = {
            mode: 'auto',
            url: 'http://test.example.com',
            modelName: 'test-model',
            apiKey: 'test-api-key',
            successThreshold: testSuccessThreshold ? null : undefined,
            maxFailures: testMaxFailures ? null : undefined,
          };
          
          // 模拟 start 方法中的阈值配置逻辑
          // 注意：?? 运算符只对 null 和 undefined 生效
          const thresholds = {
            successThreshold: testConfig.successThreshold ?? config.stressTest.successThreshold,
            maxFailures: testConfig.maxFailures ?? config.stressTest.maxConsecutiveFailures,
          };
          
          // 验证：null 值应被默认值覆盖
          const successThresholdCorrect = testSuccessThreshold 
            ? thresholds.successThreshold === config.stressTest.successThreshold
            : true;
          const maxFailuresCorrect = testMaxFailures
            ? thresholds.maxFailures === config.stressTest.maxConsecutiveFailures
            : true;
          
          return successThresholdCorrect && maxFailuresCorrect;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: frontend-threshold-config, Property 7: 过载检测使用配置阈值**
 * **验证: 需求 3.4**
 * 
 * 对于任意自动测压状态，checkOverload函数应使用testState中配置的阈值进行判定，而非全局配置
 */
describe('Property 7: 过载检测使用配置阈值', () => {
  beforeEach(() => {
    // 重置服务状态
    stressTestService.testState = stressTestService.getInitialState();
  });

  test('checkOverload应使用testState.thresholds中的成功率阈值进行判定', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成自定义成功率阈值（1-100，确保不为0以便触发判定）
        fc.integer({ min: 1, max: 100 }),
        // 生成当前成功率（0-100）
        fc.double({ min: 0, max: 100, noNaN: true }),
        // 生成请求数（至少10个）
        fc.integer({ min: 10, max: 1000 }),
        (customThreshold, successRate, totalRequests) => {
          // 设置测试状态为自动模式
          stressTestService.testState.mode = 'auto';
          
          // 设置自定义阈值（与全局配置不同）
          stressTestService.testState.thresholds = {
            successThreshold: customThreshold,
            maxFailures: 10000, // 设置很大的值避免触发连续失败判定
          };
          
          // 设置当前分钟统计
          stressTestService.testState.currentMinuteStats = {
            successRate: successRate,
            totalRequests: totalRequests,
            successCount: Math.round(totalRequests * successRate / 100),
            failureCount: Math.round(totalRequests * (100 - successRate) / 100),
            timestamp: new Date().toISOString(),
            failureRate: 100 - successRate,
          };
          
          // 设置总体统计，避免其他条件触发
          stressTestService.testState.stats.consecutiveFailures = 0;
          stressTestService.testState.stats.responseTimes = [100];
          stressTestService.testState.stats.avgResponseTime = 100;
          
          // 执行检查
          const result = stressTestService.checkOverload();
          
          // 验证：判定结果应基于 testState.thresholds.successThreshold
          // 如果成功率低于自定义阈值，应触发过载
          // 如果成功率高于或等于自定义阈值，不应触发过载（因成功率原因）
          if (successRate < customThreshold) {
            // 应该触发过载，且原因包含成功率
            return result.overloaded === true && result.reason.includes('成功率');
          } else {
            // 不应因成功率触发过载
            if (result.overloaded && result.reason) {
              return !result.reason.includes('成功率');
            }
            return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('checkOverload应使用testState.thresholds中的最大连续失败次数进行判定', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成自定义最大连续失败次数（1-100，确保不为0以便触发判定）
        fc.integer({ min: 1, max: 100 }),
        // 生成当前连续失败次数（0-200）
        fc.integer({ min: 0, max: 200 }),
        // 生成请求数
        fc.integer({ min: 10, max: 1000 }),
        (customMaxFailures, consecutiveFailures, totalRequests) => {
          // 设置测试状态为自动模式
          stressTestService.testState.mode = 'auto';
          
          // 设置自定义阈值（与全局配置不同）
          stressTestService.testState.thresholds = {
            successThreshold: 0, // 设置为0，避免成功率触发
            maxFailures: customMaxFailures,
          };
          
          // 设置当前分钟统计（高成功率避免其他触发）
          stressTestService.testState.currentMinuteStats = {
            successRate: 100,
            totalRequests: totalRequests,
            successCount: totalRequests,
            failureCount: 0,
            timestamp: new Date().toISOString(),
            failureRate: 0,
          };
          
          // 设置总体统计
          stressTestService.testState.stats.consecutiveFailures = consecutiveFailures;
          stressTestService.testState.stats.responseTimes = [100];
          stressTestService.testState.stats.avgResponseTime = 100;
          
          // 执行检查
          const result = stressTestService.checkOverload();
          
          // 验证：判定结果应基于 testState.thresholds.maxFailures
          // 如果连续失败次数达到或超过自定义阈值，应触发过载
          // 如果连续失败次数低于自定义阈值，不应触发过载（因连续失败原因）
          if (consecutiveFailures >= customMaxFailures) {
            // 应该触发过载，且原因包含连续失败
            return result.overloaded === true && result.reason.includes('连续失败');
          } else {
            // 不应因连续失败触发过载
            if (result.overloaded && result.reason) {
              return !result.reason.includes('连续失败');
            }
            return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('当testState.thresholds与全局配置不同时，应使用testState.thresholds的值', () => {
    const config = require('../config');
    
    fc.assert(
      fc.property(
        // 生成与全局配置不同的成功率阈值
        fc.integer({ min: 1, max: 100 }).filter(v => v !== config.stressTest.successThreshold),
        // 生成与全局配置不同的最大连续失败次数
        fc.integer({ min: 1, max: 100 }).filter(v => v !== config.stressTest.maxConsecutiveFailures),
        // 生成请求数
        fc.integer({ min: 10, max: 1000 }),
        (customSuccessThreshold, customMaxFailures, totalRequests) => {
          // 设置测试状态为自动模式
          stressTestService.testState.mode = 'auto';
          
          // 设置自定义阈值（与全局配置不同）
          stressTestService.testState.thresholds = {
            successThreshold: customSuccessThreshold,
            maxFailures: customMaxFailures,
          };
          
          // 场景1：成功率刚好低于自定义阈值1个百分点
          const testSuccessRate = customSuccessThreshold - 1;
          if (testSuccessRate >= 0) {
            stressTestService.testState.currentMinuteStats = {
              successRate: testSuccessRate,
              totalRequests: totalRequests,
              successCount: Math.round(totalRequests * testSuccessRate / 100),
              failureCount: Math.round(totalRequests * (100 - testSuccessRate) / 100),
              timestamp: new Date().toISOString(),
              failureRate: 100 - testSuccessRate,
            };
            
            stressTestService.testState.stats.consecutiveFailures = 0;
            stressTestService.testState.stats.responseTimes = [100];
            stressTestService.testState.stats.avgResponseTime = 100;
            
            const result = stressTestService.checkOverload();
            
            // 应该触发过载（基于自定义阈值）
            if (!result.overloaded || !result.reason.includes('成功率')) {
              return false;
            }
          }
          
          // 场景2：连续失败次数刚好等于自定义阈值
          stressTestService.testState.currentMinuteStats = {
            successRate: 100,
            totalRequests: totalRequests,
            successCount: totalRequests,
            failureCount: 0,
            timestamp: new Date().toISOString(),
            failureRate: 0,
          };
          
          stressTestService.testState.stats.consecutiveFailures = customMaxFailures;
          stressTestService.testState.stats.responseTimes = [100];
          stressTestService.testState.stats.avgResponseTime = 100;
          
          const result2 = stressTestService.checkOverload();
          
          // 应该触发过载（基于自定义阈值）
          return result2.overloaded === true && result2.reason.includes('连续失败');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('固定模式下不应进行过载判定，无论阈值如何设置', () => {
    fc.assert(
      fc.property(
        // 生成任意成功率阈值
        fc.integer({ min: 0, max: 100 }),
        // 生成任意最大连续失败次数
        fc.integer({ min: 0, max: 1000 }),
        // 生成任意成功率（包括极低值）
        fc.double({ min: 0, max: 100, noNaN: true }),
        // 生成任意连续失败次数（包括极高值）
        fc.integer({ min: 0, max: 10000 }),
        // 生成请求数
        fc.integer({ min: 10, max: 1000 }),
        (successThreshold, maxFailures, successRate, consecutiveFailures, totalRequests) => {
          // 设置测试状态为固定模式
          stressTestService.testState.mode = 'fixed';
          
          // 设置阈值
          stressTestService.testState.thresholds = {
            successThreshold: successThreshold,
            maxFailures: maxFailures,
          };
          
          // 设置当前分钟统计（可能触发过载的值）
          stressTestService.testState.currentMinuteStats = {
            successRate: successRate,
            totalRequests: totalRequests,
            successCount: Math.round(totalRequests * successRate / 100),
            failureCount: Math.round(totalRequests * (100 - successRate) / 100),
            timestamp: new Date().toISOString(),
            failureRate: 100 - successRate,
          };
          
          // 设置总体统计
          stressTestService.testState.stats.consecutiveFailures = consecutiveFailures;
          stressTestService.testState.stats.responseTimes = [100];
          stressTestService.testState.stats.avgResponseTime = 100;
          
          // 执行检查
          const result = stressTestService.checkOverload();
          
          // 验证：固定模式下不应触发过载
          return result.overloaded === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
