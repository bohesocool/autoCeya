/**
 * ParallelTestService - 并行测试服务
 * 管理多个测试的同时执行
 * 
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */
const { v4: uuidv4 } = require('uuid');
const { AIRequestService } = require('./aiService');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../../database');

// 最大并行测试数量
const MAX_PARALLEL_TESTS = 5;

class ParallelTestService {
  constructor() {
    this.parallelId = null;
    this.startTime = null;
    this.tests = new Map(); // testId -> testState
    this.clients = new Set(); // WebSocket 客户端
    this.isRunning = false;
  }

  /**
   * 添加 WebSocket 客户端
   * @param {WebSocket} ws - WebSocket 客户端
   */
  addClient(ws) {
    this.clients.add(ws);
  }

  /**
   * 移除 WebSocket 客户端
   * @param {WebSocket} ws - WebSocket 客户端
   */
  removeClient(ws) {
    this.clients.delete(ws);
  }

  /**
   * 广播消息给所有客户端
   * @param {Object} message - 消息对象
   */
  broadcast(message) {
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          logger.error('并行测试广播消息失败', { error: error.message });
        }
      }
    });
  }


  /**
   * 验证配置数量
   * @param {Array} configs - 测试配置数组
   * @throws {Error} 如果配置数量超过限制
   */
  validateConfigCount(configs) {
    if (!Array.isArray(configs)) {
      throw new Error('测试配置必须是数组');
    }
    if (configs.length === 0) {
      throw new Error('至少需要一个测试配置');
    }
    if (configs.length > MAX_PARALLEL_TESTS) {
      throw new Error(`并行测试配置数量不能超过 ${MAX_PARALLEL_TESTS} 个`);
    }
  }

  /**
   * 验证单个测试配置
   * @param {Object} testConfig - 测试配置
   * @param {number} index - 配置索引
   * @throws {Error} 如果配置无效
   */
  validateTestConfig(testConfig, index) {
    if (!testConfig.url) {
      throw new Error(`配置 ${index + 1}: URL 不能为空`);
    }
    if (!testConfig.modelName) {
      throw new Error(`配置 ${index + 1}: 模型名称不能为空`);
    }
    if (!testConfig.apiKey) {
      throw new Error(`配置 ${index + 1}: API 密钥不能为空`);
    }
    if (!testConfig.providerType) {
      throw new Error(`配置 ${index + 1}: 提供商类型不能为空`);
    }
  }

  /**
   * 创建单个测试的初始状态
   * @param {string} testId - 测试 ID
   * @param {Object} testConfig - 测试配置
   * @returns {Object} 测试状态对象
   */
  createTestState(testId, testConfig) {
    return {
      testId,
      config: testConfig,
      status: 'pending', // pending, running, completed, failed, stopped
      aiService: null,
      timers: {
        requestTimer: null,
        durationTimer: null,
      },
      stats: {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 100,
        avgResponseTime: 0,
        responseTimes: [],
        currentRPM: testConfig.rpm || 10,
        errors: {},
        errorLogs: [],
      },
      startTime: null,
      endTime: null,
    };
  }


  /**
   * 启动并行测试
   * @param {Array} configs - 测试配置数组（最多5个）
   * @returns {Object} 并行测试状态
   * @throws {Error} 如果配置无效或已有测试在运行
   */
  start(configs) {
    // 检查是否已有测试在运行
    if (this.isRunning) {
      throw new Error('已有并行测试在运行中');
    }

    // 验证配置数量（需求 3.1）
    this.validateConfigCount(configs);

    // 验证每个配置
    configs.forEach((cfg, index) => {
      this.validateTestConfig(cfg, index);
    });

    // 初始化并行测试状态
    this.parallelId = uuidv4();
    this.startTime = new Date().toISOString();
    this.isRunning = true;
    this.tests.clear();

    // 为每个配置创建测试状态
    configs.forEach((testConfig, index) => {
      const testId = `${this.parallelId}-${index}`;
      const testState = this.createTestState(testId, testConfig);
      this.tests.set(testId, testState);
    });

    logger.info('并行测试已启动', {
      parallelId: this.parallelId,
      testCount: configs.length,
    });

    // 启动所有测试（需求 3.2）
    this.tests.forEach((testState, testId) => {
      this.startSingleTest(testId);
    });

    // 广播测试启动消息
    this.broadcast({
      type: 'parallelTestStarted',
      data: this.getStatus(),
    });

    return this.getStatus();
  }

  /**
   * 启动单个测试
   * @param {string} testId - 测试 ID
   */
  startSingleTest(testId) {
    const testState = this.tests.get(testId);
    if (!testState) {
      logger.error('测试状态不存在', { testId });
      return;
    }

    try {
      const testConfig = testState.config;
      
      // 创建 AI 服务实例
      testState.aiService = new AIRequestService(
        testConfig.providerType,
        {
          url: testConfig.url,
          modelName: testConfig.modelName,
          apiKey: testConfig.apiKey,
          requestType: testConfig.requestType || 'stream',
          timeout: config.stressTest.responseTimeThreshold,
        }
      );

      testState.status = 'running';
      testState.startTime = new Date().toISOString();
      testState.stats.currentRPM = testConfig.rpm || 10;

      // 启动请求循环
      this.startTestLoop(testId);

      // 如果设置了测试时长，启动定时器
      if (testConfig.testDuration && testConfig.testDuration > 0) {
        const durationMs = testConfig.testDuration * 60000;
        testState.timers.durationTimer = setTimeout(() => {
          this.stopSingleTest(testId, '达到设定测试时长');
        }, durationMs);
      }

      logger.info('单个测试已启动', {
        testId,
        modelName: testConfig.modelName,
        providerType: testConfig.providerType,
      });
    } catch (error) {
      testState.status = 'failed';
      testState.endTime = new Date().toISOString();
      logger.error('启动单个测试失败', { testId, error: error.message });
    }
  }


  /**
   * 启动测试请求循环
   * @param {string} testId - 测试 ID
   */
  startTestLoop(testId) {
    const testState = this.tests.get(testId);
    if (!testState) return;

    const rpm = testState.stats.currentRPM;
    const interval = 60000 / rpm;

    testState.timers.requestTimer = setInterval(async () => {
      if (testState.status !== 'running') {
        this.clearTestTimers(testId);
        return;
      }

      await this.executeRequest(testId);
    }, interval);
  }

  /**
   * 执行单个请求
   * @param {string} testId - 测试 ID
   */
  async executeRequest(testId) {
    const testState = this.tests.get(testId);
    if (!testState || testState.status !== 'running') return;

    const testConfig = testState.config;
    const prompt = this.getTestPrompt(testConfig);

    try {
      const result = await testState.aiService.execute(prompt);

      if (result.success) {
        testState.stats.successCount++;
        testState.stats.responseTimes.push(result.responseTime);
      } else {
        testState.stats.failureCount++;
        
        // 记录错误
        const errorKey = result.error.substring(0, 100);
        testState.stats.errors[errorKey] = (testState.stats.errors[errorKey] || 0) + 1;
        
        // 添加错误日志
        testState.stats.errorLogs.unshift({
          time: new Date().toISOString(),
          message: result.error,
          statusCode: result.status,
        });
        if (testState.stats.errorLogs.length > 50) {
          testState.stats.errorLogs.pop();
        }
      }

      testState.stats.totalRequests++;
      this.updateTestStats(testId);

      // 广播状态更新
      this.broadcast({
        type: 'parallelTestUpdate',
        data: {
          parallelId: this.parallelId,
          testId,
          stats: testState.stats,
          status: testState.status,
        },
      });
    } catch (error) {
      logger.error('执行请求失败', { testId, error: error.message });
    }
  }

  /**
   * 获取测试语句
   * @param {Object} testConfig - 测试配置
   * @returns {string} 测试语句
   */
  getTestPrompt(testConfig) {
    const { promptMode, testPrompt, randomPrompts } = testConfig;
    
    if (promptMode === 'random') {
      if (randomPrompts && randomPrompts.length > 0) {
        const basePrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
        return this.generateRandomPrompt(basePrompt);
      } else {
        return this.generateRandomPrompt(null);
      }
    } else {
      return testPrompt || '你好，请简单介绍一下自己。';
    }
  }

  /**
   * 生成随机测试语句
   * @param {string|null} basePrompt - 基础语句
   * @returns {string} 随机语句
   */
  generateRandomPrompt(basePrompt) {
    if (!basePrompt) {
      const templates = [
        "请用{length}字左右介绍一下{topic}",
        "能否详细解释{topic}的相关知识？",
        "我想了解关于{topic}的信息，请详细说明",
      ];
      const topics = [
        "人工智能", "机器学习", "深度学习", "自然语言处理", "计算机视觉",
      ];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const length = [50, 100, 200][Math.floor(Math.random() * 3)];
      return template.replace('{topic}', topic).replace('{length}', length);
    } else {
      const variations = [
        basePrompt,
        basePrompt + " 请详细说明。",
        basePrompt + " 能否展开讲讲？",
        "问题：" + basePrompt,
        basePrompt + " 谢谢！",
        basePrompt + ` (${Date.now()})`,
      ];
      return variations[Math.floor(Math.random() * variations.length)];
    }
  }


  /**
   * 更新测试统计数据
   * @param {string} testId - 测试 ID
   */
  updateTestStats(testId) {
    const testState = this.tests.get(testId);
    if (!testState) return;

    const stats = testState.stats;
    const total = stats.totalRequests;
    
    if (total > 0) {
      stats.successRate = parseFloat(((stats.successCount / total) * 100).toFixed(2));
    }
    
    if (stats.responseTimes.length > 0) {
      const sum = stats.responseTimes.reduce((a, b) => a + b, 0);
      stats.avgResponseTime = Math.round(sum / stats.responseTimes.length);
    }
  }

  /**
   * 停止所有并行测试
   * @returns {Object} 最终状态
   */
  stop() {
    if (!this.isRunning) {
      throw new Error('没有正在运行的并行测试');
    }

    logger.info('停止所有并行测试', { parallelId: this.parallelId });

    // 停止所有测试（需求 3.4）
    this.tests.forEach((testState, testId) => {
      if (testState.status === 'running') {
        this.stopSingleTest(testId, '手动停止');
      }
    });

    this.isRunning = false;

    // 广播测试停止消息
    this.broadcast({
      type: 'parallelTestStopped',
      data: this.getStatus(),
    });

    return this.getStatus();
  }

  /**
   * 停止单个测试
   * @param {string} testId - 测试 ID
   * @param {string} reason - 停止原因
   */
  stopSingleTest(testId, reason) {
    const testState = this.tests.get(testId);
    if (!testState) return;

    // 清除定时器
    this.clearTestTimers(testId);

    // 更新状态
    testState.status = reason === '手动停止' ? 'stopped' : 'completed';
    testState.endTime = new Date().toISOString();

    // 保存测试历史（需求 3.5）
    this.saveTestHistory(testId, reason);

    logger.info('单个测试已停止', {
      testId,
      reason,
      stats: testState.stats,
    });

    // 检查是否所有测试都已完成
    this.checkAllTestsCompleted();
  }

  /**
   * 清除测试定时器
   * @param {string} testId - 测试 ID
   */
  clearTestTimers(testId) {
    const testState = this.tests.get(testId);
    if (!testState) return;

    if (testState.timers.requestTimer) {
      clearInterval(testState.timers.requestTimer);
      testState.timers.requestTimer = null;
    }
    if (testState.timers.durationTimer) {
      clearTimeout(testState.timers.durationTimer);
      testState.timers.durationTimer = null;
    }
  }

  /**
   * 检查是否所有测试都已完成
   */
  checkAllTestsCompleted() {
    let allCompleted = true;
    this.tests.forEach(testState => {
      if (testState.status === 'running' || testState.status === 'pending') {
        allCompleted = false;
      }
    });

    if (allCompleted && this.isRunning) {
      this.isRunning = false;
      logger.info('所有并行测试已完成', { parallelId: this.parallelId });
      
      // 广播所有测试完成消息
      this.broadcast({
        type: 'parallelTestAllCompleted',
        data: this.getStatus(),
      });
    }
  }


  /**
   * 保存测试历史
   * @param {string} testId - 测试 ID
   * @param {string} stopReason - 停止原因
   */
  saveTestHistory(testId, stopReason) {
    const testState = this.tests.get(testId);
    if (!testState) return;

    try {
      const historyData = {
        startTime: testState.startTime,
        endTime: testState.endTime || new Date().toISOString(),
        duration: testState.startTime 
          ? new Date(testState.endTime || Date.now()).getTime() - new Date(testState.startTime).getTime()
          : 0,
        testUrl: testState.config.url,
        modelName: testState.config.modelName,
        testMode: testState.config.mode || 'fixed',
        promptMode: testState.config.promptMode || 'fixed',
        requestType: testState.config.requestType || 'stream',
        targetRPM: testState.stats.currentRPM,
        maxRPM: null,
        totalRequests: testState.stats.totalRequests,
        successCount: testState.stats.successCount,
        failureCount: testState.stats.failureCount,
        successRate: testState.stats.successRate,
        avgResponseTime: testState.stats.avgResponseTime,
        stopReason: `并行测试: ${stopReason}`,
        minuteStats: [],
        errorSummary: testState.stats.errors,
        parallelId: this.parallelId,
        testId: testId,
      };

      const historyId = db.saveHistory(historyData);
      logger.info('并行测试历史已保存', { testId, historyId });
    } catch (error) {
      logger.error('保存并行测试历史失败', { testId, error: error.message });
    }
  }

  /**
   * 获取所有并行测试状态
   * @returns {Object} 并行测试状态
   */
  getStatus() {
    const tests = [];
    
    this.tests.forEach((testState, testId) => {
      tests.push({
        testId,
        config: {
          url: testState.config.url,
          modelName: testState.config.modelName,
          providerType: testState.config.providerType,
          rpm: testState.config.rpm,
          testDuration: testState.config.testDuration,
        },
        status: testState.status,
        stats: {
          totalRequests: testState.stats.totalRequests,
          successCount: testState.stats.successCount,
          failureCount: testState.stats.failureCount,
          successRate: testState.stats.successRate,
          avgResponseTime: testState.stats.avgResponseTime,
          currentRPM: testState.stats.currentRPM,
        },
        startTime: testState.startTime,
        endTime: testState.endTime,
      });
    });

    return {
      parallelId: this.parallelId,
      startTime: this.startTime,
      isRunning: this.isRunning,
      testCount: this.tests.size,
      tests,
    };
  }

  /**
   * 获取单个测试状态
   * @param {string} testId - 测试 ID
   * @returns {Object|null} 测试状态
   */
  getTestStatus(testId) {
    const testState = this.tests.get(testId);
    if (!testState) return null;

    return {
      testId,
      config: {
        url: testState.config.url,
        modelName: testState.config.modelName,
        providerType: testState.config.providerType,
        rpm: testState.config.rpm,
        testDuration: testState.config.testDuration,
      },
      status: testState.status,
      stats: {
        totalRequests: testState.stats.totalRequests,
        successCount: testState.stats.successCount,
        failureCount: testState.stats.failureCount,
        successRate: testState.stats.successRate,
        avgResponseTime: testState.stats.avgResponseTime,
        currentRPM: testState.stats.currentRPM,
      },
      startTime: testState.startTime,
      endTime: testState.endTime,
    };
  }

  /**
   * 重置服务状态
   */
  reset() {
    // 停止所有运行中的测试
    if (this.isRunning) {
      this.tests.forEach((testState, testId) => {
        this.clearTestTimers(testId);
      });
    }

    this.parallelId = null;
    this.startTime = null;
    this.tests.clear();
    this.isRunning = false;
  }
}

// 导出单例
module.exports = new ParallelTestService();
