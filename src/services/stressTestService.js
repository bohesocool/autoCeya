const { AIRequestService } = require('./aiService');
const config = require('../config');
const log = require('../utils/logger');
const db = require('../../database');
const CircularBuffer = require('../utils/circularBuffer');
const MemoryMonitor = require('../utils/memoryMonitor');

/**
 * 测压服务类
 */
class StressTestService {
  constructor() {
    this.testState = this.getInitialState();
    this.timers = {
      requestTimer: null,
      minuteStatsTimer: null,
      rpmUpdateTimer: null,
      durationTimer: null,
      broadcastThrottleTimer: null,
    };
    this.aiService = null;
    this.clients = new Set(); // WebSocket 客户端
    this.pendingBroadcast = false; // 节流标志
    this.lastBroadcastTime = 0; // 上次广播时间
    this.broadcastInterval = 200; // 广播间隔（毫秒）
    
    // 使用循环缓冲区存储数据，避免内存无限增长
    this.responseTimes = new CircularBuffer(1000);  // 响应时间缓冲区（容量 1000）
    this.errorLogs = new CircularBuffer(100);       // 错误日志缓冲区（容量 100）
    this.requestLogs = new CircularBuffer(500);     // 请求日志缓冲区（容量 500）
    
    // 内存监控器
    this.memoryMonitor = null;
  }

  /**
   * 获取初始状态
   */
  getInitialState() {
    return {
      isRunning: false,
      mode: 'fixed',
      currentRPM: 0,
      targetRPM: 0,
      stats: {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        errors: {},
        avgResponseTime: 0,
        // responseTimes, errorLogs, requestLogs 已移至循环缓冲区
        successRate: 100,
        failureRate: 0,
        consecutiveFailures: 0,
        rpmHistory: [],
        minuteStats: [],
      },
      config: {
        url: '',
        modelName: '',
        apiKey: '',
        testPrompt: '',
        promptMode: 'fixed',
        randomPrompts: [],
        requestType: 'stream',
        testDuration: 0,
        providerType: 'gemini', // 新增：AI提供商类型
      },
      startTime: null,
      lastIncrementTime: null,
      lastMinuteTime: null,
      currentMinuteStats: {
        successCount: 0,
        failureCount: 0,
        timestamp: null,
        totalRequests: 0,
        successRate: 100,
        failureRate: 0,
      },
    };
  }

  /**
   * 添加 WebSocket 客户端
   */
  addClient(ws) {
    this.clients.add(ws);
  }

  /**
   * 移除 WebSocket 客户端
   */
  removeClient(ws) {
    this.clients.delete(ws);
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message) {
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          log.error('广播消息失败', { error: error.message });
        }
      }
    });
  }

  /**
   * 节流广播统计更新
   */
  broadcastStatsThrottled() {
    const now = Date.now();
    
    // 如果距离上次广播时间小于间隔，则标记待广播
    if (now - this.lastBroadcastTime < this.broadcastInterval) {
      if (!this.pendingBroadcast) {
        this.pendingBroadcast = true;
        // 延迟广播
        if (this.timers.broadcastThrottleTimer) {
          clearTimeout(this.timers.broadcastThrottleTimer);
        }
        this.timers.broadcastThrottleTimer = setTimeout(() => {
          this.executeBroadcast();
        }, this.broadcastInterval - (now - this.lastBroadcastTime));
      }
      return;
    }
    
    // 可以立即广播
    this.executeBroadcast();
  }

  /**
   * 执行广播
   */
  executeBroadcast() {
    this.pendingBroadcast = false;
    this.lastBroadcastTime = Date.now();
    
    // 广播总体统计更新（使用 getState() 确保包含 CircularBuffer 数据）
    this.broadcast({
      type: 'statsUpdate',
      data: this.getState(),
    });
    
    // 广播当前分钟统计更新（实时请求数）
    this.broadcast({
      type: 'currentMinuteStatsUpdate',
      data: this.testState.currentMinuteStats,
    });
  }

  /**
   * 获取当前状态
   */
  getState() {
    // 返回状态时，包含循环缓冲区中的数据
    return {
      ...this.testState,
      stats: {
        ...this.testState.stats,
        // 从循环缓冲区获取数据
        responseTimes: this.responseTimes.getAll(),
        errorLogs: this.errorLogs.getAll().reverse(), // 最新的在前
        requestLogs: this.requestLogs.getAll().reverse(), // 最新的在前
      },
    };
  }

  /**
   * 获取内存使用情况
   * @returns {Object|null} 内存使用统计
   */
  getMemoryUsage() {
    if (this.memoryMonitor) {
      return this.memoryMonitor.getMemoryUsage();
    }
    // 如果没有内存监控器，直接获取内存信息
    const memUsage = process.memoryUsage();
    const MB = 1024 * 1024;
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      heapUsedMB: Math.round(memUsage.heapUsed / MB * 100) / 100,
      heapTotalMB: Math.round(memUsage.heapTotal / MB * 100) / 100,
      rssMB: Math.round(memUsage.rss / MB * 100) / 100,
      externalMB: Math.round(memUsage.external / MB * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 启动测压
   */
  start(testConfig) {
    if (this.testState.isRunning) {
      throw new Error('测试已在进行中');
    }

    const now = Date.now();
    
    // 重置状态
    this.testState = {
      ...this.getInitialState(),
      isRunning: true,
      mode: testConfig.mode || 'fixed',
      currentRPM: testConfig.mode === 'auto' 
        ? config.stressTest.autoMode.initialRPM 
        : testConfig.rpm,
      targetRPM: testConfig.mode === 'auto'
        ? config.stressTest.autoMode.initialRPM
        : testConfig.rpm,
      config: {
        url: testConfig.url,
        modelName: testConfig.modelName,
        apiKey: testConfig.apiKey,
        testPrompt: testConfig.testPrompt || '',
        promptMode: testConfig.promptMode || 'fixed',
        randomPrompts: testConfig.randomPrompts || [],
        requestType: testConfig.requestType || 'stream',
        testDuration: testConfig.mode === 'fixed' ? (testConfig.testDuration || 0) : 0,
        providerType: testConfig.providerType || 'gemini',
      },
      // 阈值配置：使用前端传递的值，未传递时使用环境变量默认值
      thresholds: {
        successThreshold: testConfig.successThreshold ?? config.stressTest.successThreshold,
        maxFailures: testConfig.maxFailures ?? config.stressTest.maxConsecutiveFailures,
      },
      startTime: now,
      lastIncrementTime: now,
      lastMinuteTime: now,
      currentMinuteStats: {
        successCount: 0,
        failureCount: 0,
        timestamp: new Date(now).toISOString(),
        totalRequests: 0,
        successRate: 100,
        failureRate: 0,
      },
    };

    // 清空循环缓冲区
    this.responseTimes.clear();
    this.errorLogs.clear();
    this.requestLogs.clear();

    // 创建 AI 服务实例
    this.aiService = new AIRequestService(
      this.testState.config.providerType,
      {
        url: this.testState.config.url,
        modelName: this.testState.config.modelName,
        apiKey: this.testState.config.apiKey,
        requestType: this.testState.config.requestType,
        timeout: config.stressTest.responseTimeThreshold,
      }
    );

    // 启动内存监控
    const MB = 1024 * 1024;
    this.memoryMonitor = new MemoryMonitor({
      warningThreshold: 500 * MB,   // 警告阈值 500MB
      criticalThreshold: 800 * MB,  // 临界阈值 800MB
      checkInterval: 30000,         // 每 30 秒检查一次
    });
    this.memoryMonitor.start();

    log.testStart({
      mode: this.testState.mode,
      currentRPM: this.testState.currentRPM,
      modelName: this.testState.config.modelName,
      url: this.testState.config.url,
      providerType: this.testState.config.providerType,
    });

    this.startTestLoop();

    return { success: true, message: '测试已启动' };
  }

  /**
   * 停止测压
   */
  stop() {
    if (!this.testState.isRunning) {
      throw new Error('没有正在进行的测试');
    }

    this.testState.isRunning = false;
    this.clearAllTimers();
    
    // 停止内存监控
    if (this.memoryMonitor) {
      this.memoryMonitor.stop();
      this.memoryMonitor = null;
    }
    
    // 保存测试历史
    this.saveHistory('手动停止', this.testState.mode === 'auto' ? this.testState.currentRPM : null);
    
    log.testStop('手动停止', this.testState.stats);
    
    // 广播测试停止消息
    this.broadcast({
      type: 'testStopped',
      data: { 
        reason: '手动停止', 
        finalStats: this.testState.stats,
        maxRPM: this.testState.mode === 'auto' ? this.testState.currentRPM : null,
      },
    });

    return { success: true, message: '测试已停止' };
  }

  /**
   * 清除所有定时器
   */
  clearAllTimers() {
    Object.keys(this.timers).forEach(key => {
      if (this.timers[key]) {
        clearInterval(this.timers[key]);
        clearTimeout(this.timers[key]);
        this.timers[key] = null;
      }
    });
  }

  /**
   * 获取测试语句
   */
  getTestPrompt() {
    const { promptMode, testPrompt, randomPrompts } = this.testState.config;
    
    if (promptMode === 'random') {
      if (randomPrompts && randomPrompts.length > 0) {
        const basePrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
        return this.generateRandomPrompt(basePrompt);
      } else {
        return this.generateRandomPrompt(null);
      }
    } else {
      return testPrompt;
    }
  }

  /**
   * 生成随机测试语句
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
   * 执行单个请求
   */
  async executeRequest() {
    const prompt = this.getTestPrompt();
    const result = await this.aiService.execute(prompt);

    if (result.success) {
      this.testState.stats.successCount++;
      this.testState.stats.consecutiveFailures = 0;
      // 使用循环缓冲区存储响应时间
      this.responseTimes.push(result.responseTime);
      this.testState.currentMinuteStats.successCount++;
    } else {
      this.testState.stats.failureCount++;
      this.testState.stats.consecutiveFailures++;
      this.testState.currentMinuteStats.failureCount++;
      
      // 记录错误
      const errorKey = result.error.substring(0, 100);
      this.testState.stats.errors[errorKey] = (this.testState.stats.errors[errorKey] || 0) + 1;
      
      // 使用循环缓冲区存储错误日志
      this.errorLogs.push({
        time: new Date().toISOString(),
        message: result.error,
        statusCode: result.status,
      });
    }

    this.testState.stats.totalRequests++;
    this.testState.currentMinuteStats.totalRequests++;

    // 添加请求日志
    this.addRequestLog({
      status: result.success ? 'success' : 'failure',
      responseTime: result.responseTime,
      statusCode: result.status,
      error: result.error || null,
      requestType: result.requestType,
      ttfb: result.ttfb,
    });

    // 更新统计
    this.updateStats();

    // 检查是否过载
    return this.checkOverload();
  }

  /**
   * 添加请求日志
   */
  addRequestLog(logData) {
    const logEntry = {
      time: new Date().toISOString(),
      status: logData.status,
      responseTime: logData.responseTime,
      statusCode: logData.statusCode,
      error: logData.error || null,
      modelName: this.testState.config.modelName,
      provider: this.testState.config.providerType,
      rpm: this.testState.currentRPM,
      requestType: logData.requestType || this.testState.config.requestType || 'stream',
      ttfb: logData.ttfb || null, // 首字节时间（仅流式请求）
    };
    
    // 使用循环缓冲区存储请求日志
    this.requestLogs.push(logEntry);
    
    this.broadcast({
      type: 'requestLogUpdate',
      data: logEntry,
    });
  }

  /**
   * 更新统计数据
   */
  updateStats() {
    const total = this.testState.stats.totalRequests;
    if (total > 0) {
      this.testState.stats.successRate = ((this.testState.stats.successCount / total) * 100).toFixed(2);
      this.testState.stats.failureRate = ((this.testState.stats.failureCount / total) * 100).toFixed(2);
    }
    
    // 使用循环缓冲区的 getAverage 方法计算平均响应时间
    if (this.responseTimes.count > 0) {
      this.testState.stats.avgResponseTime = Math.round(this.responseTimes.getAverage());
    }

    // 更新当前分钟统计
    const minuteTotal = this.testState.currentMinuteStats.totalRequests;
    if (minuteTotal > 0) {
      this.testState.currentMinuteStats.successRate = 
        ((this.testState.currentMinuteStats.successCount / minuteTotal) * 100).toFixed(2);
      this.testState.currentMinuteStats.failureRate = 
        ((this.testState.currentMinuteStats.failureCount / minuteTotal) * 100).toFixed(2);
    }
    
    // 使用节流广播，避免频繁发送
    this.broadcastStatsThrottled();
  }

  /**
   * 检查是否过载
   */
  checkOverload() {
    if (this.testState.mode === 'fixed') {
      return { overloaded: false };
    }
    
    const stats = this.testState.stats;
    const minuteStats = this.testState.currentMinuteStats;
    const { successThreshold, maxFailures } = this.testState.thresholds;
    
    // 条件1: 当前分钟成功率低于阈值（阈值为0时跳过判定）
    if (successThreshold > 0 && minuteStats.totalRequests >= 10 && 
        minuteStats.successRate < successThreshold) {
      return {
        overloaded: true,
        reason: `本分钟成功率(${minuteStats.successRate}%)低于阈值(${successThreshold}%)`,
      };
    }
    
    // 条件2: 连续失败次数过多（阈值为0时跳过判定）
    if (maxFailures > 0 && stats.consecutiveFailures >= maxFailures) {
      return {
        overloaded: true,
        reason: `连续失败${stats.consecutiveFailures}次`,
      };
    }
    
    // 条件3: 平均响应时间过长（使用循环缓冲区的 count 属性）
    if (this.responseTimes.count >= 10 && stats.avgResponseTime > config.stressTest.responseTimeThreshold) {
      return {
        overloaded: true,
        reason: `平均响应时间(${stats.avgResponseTime}ms)超过阈值`,
      };
    }
    
    return { overloaded: false };
  }

  /**
   * 记录每分钟统计
   */
  recordMinuteStats() {
    this.testState.stats.minuteStats.push({
      timestamp: this.testState.currentMinuteStats.timestamp,
      successCount: this.testState.currentMinuteStats.successCount,
      failureCount: this.testState.currentMinuteStats.failureCount,
      rpm: this.testState.currentRPM,
    });
    
    // 保留最近1440分钟（24小时）
    if (this.testState.stats.minuteStats.length > 1440) {
      this.testState.stats.minuteStats.shift();
    }
    
    // 统计错误信息（使用循环缓冲区获取错误日志）
    const errorSummary = {};
    const recentErrors = this.errorLogs.getAll();
    recentErrors.forEach(error => {
      const key = error.statusCode || 'unknown';
      errorSummary[key] = (errorSummary[key] || 0) + 1;
    });
    
    // 记录分钟统计日志，包含错误摘要
    const logData = {
      rpm: this.testState.currentRPM,
      requests: this.testState.currentMinuteStats.totalRequests,
      successCount: this.testState.currentMinuteStats.successCount,
      failureCount: this.testState.currentMinuteStats.failureCount,
      successRate: this.testState.currentMinuteStats.successRate,
    };
    
    // 只有在有失败的情况下才添加错误摘要
    if (this.testState.currentMinuteStats.failureCount > 0) {
      logData.errorSummary = errorSummary;
    }
    
    log.info('📊 分钟统计', logData);
    
    // 重置当前分钟统计
    const now = Date.now();
    this.testState.lastMinuteTime = now;
    this.testState.currentMinuteStats = {
      successCount: 0,
      failureCount: 0,
      timestamp: new Date(now).toISOString(),
      totalRequests: 0,
      successRate: 100,
      failureRate: 0,
    };
    
    this.broadcast({
      type: 'minuteStatsUpdate',
      data: this.testState.stats.minuteStats,
    });
  }

  /**
   * 启动测试循环
   */
  startTestLoop() {
    const interval = 60000 / this.testState.targetRPM;
    
    // 分钟统计定时器
    this.timers.minuteStatsTimer = setInterval(() => {
      if (!this.testState.isRunning) {
        clearInterval(this.timers.minuteStatsTimer);
        return;
      }
      this.recordMinuteStats();
    }, 60000);
    
    // 固定模式测试时长定时器
    if (this.testState.mode === 'fixed' && this.testState.config.testDuration > 0) {
      const durationMs = this.testState.config.testDuration * 60000;
      this.timers.durationTimer = setTimeout(() => {
        this.testState.isRunning = false;
        this.clearAllTimers();
        this.saveHistory(`达到设定测试时长(${this.testState.config.testDuration}分钟)`);
        this.broadcast({
          type: 'testStopped',
          data: { reason: '达到测试时长', finalStats: this.testState.stats },
        });
      }, durationMs);
    }
    
    // 请求定时器
    this.timers.requestTimer = setInterval(async () => {
      if (!this.testState.isRunning) {
        this.clearAllTimers();
        return;
      }
      
      const overloadCheck = await this.executeRequest();
      
      if (overloadCheck.overloaded) {
        this.testState.isRunning = false;
        this.clearAllTimers();
        this.saveHistory(overloadCheck.reason, this.testState.currentRPM);
        this.broadcast({
          type: 'testStopped',
          data: {
            reason: overloadCheck.reason,
            finalStats: this.testState.stats,
            maxRPM: this.testState.currentRPM,
          },
        });
      }
    }, interval);
    
    // 自动模式 RPM 递增定时器
    if (this.testState.mode === 'auto') {
      this.timers.rpmUpdateTimer = setInterval(() => {
        if (!this.testState.isRunning) {
          clearInterval(this.timers.rpmUpdateTimer);
          return;
        }
        
        const { incrementRPM, incrementInterval, maxRPM } = config.stressTest.autoMode;
        const now = Date.now();
        
        if (now - this.testState.lastIncrementTime >= incrementInterval) {
          const newRPM = Math.min(this.testState.currentRPM + incrementRPM, maxRPM);
          
          if (newRPM !== this.testState.currentRPM) {
            this.testState.currentRPM = newRPM;
            this.testState.targetRPM = newRPM;
            this.testState.lastIncrementTime = now;
            
            log.rpmIncrease(newRPM);
            
            this.broadcast({
              type: 'rpmIncreased',
              data: { newRPM, time: new Date().toISOString() },
            });
            
            // 重启测试以应用新的 RPM
            this.clearAllTimers();
            this.startTestLoop();
          }
        }
      }, 1000);
    }
  }

  /**
   * 保存测试历史
   */
  saveHistory(stopReason, maxRPM = null) {
    try {
      const historyData = {
        startTime: new Date(this.testState.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - this.testState.startTime,
        testUrl: this.testState.config.url,
        modelName: this.testState.config.modelName,
        testMode: this.testState.mode,
        promptMode: this.testState.config.promptMode,
        requestType: this.testState.config.requestType,
        targetRPM: this.testState.targetRPM,
        maxRPM: maxRPM,
        totalRequests: this.testState.stats.totalRequests,
        successCount: this.testState.stats.successCount,
        failureCount: this.testState.stats.failureCount,
        successRate: parseFloat(this.testState.stats.successRate),
        avgResponseTime: this.testState.stats.avgResponseTime,
        stopReason: stopReason,
        minuteStats: this.testState.stats.minuteStats,
        errorSummary: this.testState.stats.errors,
      };
      
      const historyId = db.saveHistory(historyData);
      log.info(`测试历史已保存`, { historyId });
    } catch (error) {
      log.error('保存测试历史失败', { error: error.message });
    }
  }

  /**
   * 清除请求日志
   */
  clearRequestLogs() {
    this.requestLogs.clear();
    this.broadcast({
      type: 'logsCleared',
    });
  }
}

// 导出单例
module.exports = new StressTestService();


