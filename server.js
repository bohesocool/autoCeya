const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');
const config = require('./config');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 定时器管理
let timers = {
  requestTimer: null,
  minuteStatsTimer: null,
  rpmUpdateTimer: null,
  durationTimer: null
};

// 测压状态管理
let testState = {
  isRunning: false,
  mode: 'fixed', // 'fixed' 或 'auto'
  currentRPM: 0,
  targetRPM: 0,
    stats: {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      errors: {},
      avgResponseTime: 0,
      responseTimes: [],
      successRate: 100,
      failureRate: 0,
      consecutiveFailures: 0,
      rpmHistory: [],
      errorLogs: [],
      // 每分钟统计数据（用于绘制曲线图）
      minuteStats: [],
      // 详细请求日志
      requestLogs: []
    },
  config: {
    url: '',
    modelName: '',
    apiKey: '',
    testPrompt: '',
    promptMode: 'fixed', // 'fixed' 或 'random'
    randomPrompts: [],
    requestType: 'stream', // 'stream' 或 'non-stream'
    testDuration: 0 // 固定测压的测试时长（分钟），0表示无限制
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
    failureRate: 0
  }
};

// WebSocket连接管理
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('新客户端连接');
  
  // 发送当前状态
  ws.send(JSON.stringify({
    type: 'stateUpdate',
    data: testState
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('客户端断开连接');
  });
});

// 广播消息给所有客户端
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// 认证中间件
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token === config.authSecret) {
    next();
  } else {
    res.status(401).json({ error: '认证失败' });
  }
}

// 登录接口
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === config.authSecret) {
    res.json({ success: true, token: config.authSecret });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

// 随机测试语句生成器
const randomPromptTemplates = [
  "请用{length}字左右介绍一下{topic}",
  "能否详细解释{topic}的相关知识？",
  "我想了解关于{topic}的信息，请详细说明",
  "请分析一下{topic}的特点和优势",
  "能否总结{topic}的主要内容？",
  "请描述{topic}的工作原理",
  "我对{topic}很感兴趣，请介绍一下",
  "请比较{topic}和传统方法的区别",
  "能否举例说明{topic}的应用场景？",
  "请阐述{topic}的重要性和意义"
];

const randomTopics = [
  "人工智能", "机器学习", "深度学习", "自然语言处理", "计算机视觉",
  "量子计算", "区块链技术", "云计算", "大数据", "物联网",
  "5G技术", "边缘计算", "网络安全", "数据库优化", "分布式系统",
  "微服务架构", "容器化技术", "DevOps", "敏捷开发", "软件工程",
  "算法设计", "数据结构", "操作系统", "计算机网络", "编程语言",
  "前端开发", "后端开发", "移动开发", "游戏开发", "嵌入式系统"
];

function generateRandomPrompt(basePrompt) {
  if (!basePrompt) {
    // 完全随机生成
    const template = randomPromptTemplates[Math.floor(Math.random() * randomPromptTemplates.length)];
    const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    const length = [50, 100, 200, 300][Math.floor(Math.random() * 4)];
    return template.replace('{topic}', topic).replace('{length}', length);
  } else {
    // 基于基础语句进行随机变化
    const variations = [
      basePrompt,
      basePrompt + " 请详细说明。",
      basePrompt + " 能否展开讲讲？",
      "问题：" + basePrompt,
      basePrompt + " 谢谢！",
      basePrompt + ` (${Date.now()})`,
      `[查询] ${basePrompt}`,
      `${basePrompt} - 请给出专业的回答。`
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }
}

// 开始测压
app.post('/api/start', authenticate, (req, res) => {
  if (testState.isRunning) {
    return res.status(400).json({ error: '测试已在进行中' });
  }

  const { mode, rpm, url, modelName, apiKey, testPrompt, promptMode, randomPrompts, requestType, testDuration } = req.body;

  // 验证必填参数
  if (!url || !modelName || !apiKey) {
    return res.status(400).json({ error: '请填写URL、模型名称和API密钥' });
  }
  
  if (promptMode === 'fixed' && !testPrompt) {
    return res.status(400).json({ error: '固定模式下请填写测试语句' });
  }
  
  if (promptMode === 'random' && (!randomPrompts || randomPrompts.length === 0)) {
    return res.status(400).json({ error: '随机模式下请至少添加一条测试语句' });
  }
  
  if (mode === 'fixed' && testDuration && testDuration < 1) {
    return res.status(400).json({ error: '测试时长必须大于0分钟' });
  }

  // 重置状态
  const now = Date.now();
  testState = {
    isRunning: true,
    mode: mode || 'fixed',
    currentRPM: mode === 'auto' ? config.stressTest.autoMode.initialRPM : rpm,
    targetRPM: mode === 'auto' ? config.stressTest.autoMode.initialRPM : rpm,
    stats: {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      errors: {},
      avgResponseTime: 0,
      responseTimes: [],
      successRate: 100,
      failureRate: 0,
      consecutiveFailures: 0,
      rpmHistory: [],
      errorLogs: [],
      minuteStats: [],
      requestLogs: []
    },
    config: { 
      url, 
      modelName, 
      apiKey, 
      testPrompt,
      promptMode: promptMode || 'fixed',
      randomPrompts: randomPrompts || [],
      requestType: requestType || 'stream',
      testDuration: mode === 'fixed' ? (testDuration || 0) : 0
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
      failureRate: 0
    }
  };

  startStressTest();
  res.json({ success: true, message: '测试已启动' });
});

// 停止测压
app.post('/api/stop', authenticate, (req, res) => {
  if (!testState.isRunning) {
    return res.status(400).json({ error: '没有正在进行的测试' });
  }

  testState.isRunning = false;
  res.json({ success: true, message: '测试已停止' });
});

// 获取当前状态
app.get('/api/status', authenticate, (req, res) => {
  res.json(testState);
});

// 获取测试语句
function getTestPrompt() {
  const { promptMode, testPrompt, randomPrompts } = testState.config;
  
  if (promptMode === 'random') {
    if (randomPrompts && randomPrompts.length > 0) {
      // 从用户提供的语句中随机选择一条
      const basePrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
      return generateRandomPrompt(basePrompt);
    } else {
      // 完全随机生成
      return generateRandomPrompt(null);
    }
  } else {
    return testPrompt;
  }
}

// 执行单个API请求
async function executeRequest() {
  const startTime = Date.now();
  const { url, modelName, apiKey, requestType } = testState.config;
  const prompt = getTestPrompt();

  try {
    // 根据requestType选择API端点
    const endpoint = requestType === 'stream' ? 'streamGenerateContent' : 'generateContent';
    const fullUrl = requestType === 'stream' 
      ? `${url}/v1beta/models/${modelName}:${endpoint}?key=${apiKey}&alt=sse`
      : `${url}/v1beta/models/${modelName}:${endpoint}?key=${apiKey}`;
    
    const response = await axios.post(fullUrl, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    }, {
      timeout: config.stressTest.responseTimeThreshold,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;
    
    // 更新统计
    testState.stats.totalRequests++;
    testState.stats.successCount++;
    testState.stats.consecutiveFailures = 0;
    testState.stats.responseTimes.push(responseTime);
    
    // 更新当前分钟统计
    testState.currentMinuteStats.successCount++;
    testState.currentMinuteStats.totalRequests++;
    updateCurrentMinuteStats();
    
    // 添加请求日志
    addRequestLog({
      status: 'success',
      responseTime,
      statusCode: response.status || 200,
      modelName: testState.config.modelName,
      requestType: testState.config.requestType
    });
    
    // 只保留最近1000个响应时间
    if (testState.stats.responseTimes.length > 1000) {
      testState.stats.responseTimes.shift();
    }
    
    updateStats();
    return { success: true, responseTime };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // 更新失败统计
    testState.stats.totalRequests++;
    testState.stats.failureCount++;
    testState.stats.consecutiveFailures++;
    
    // 更新当前分钟统计
    testState.currentMinuteStats.failureCount++;
    testState.currentMinuteStats.totalRequests++;
    updateCurrentMinuteStats();
    
    // 记录错误
    const errorMessage = error.response?.data?.error?.message || error.message || '未知错误';
    const errorKey = errorMessage.substring(0, 100); // 限制错误消息长度
    
    testState.stats.errors[errorKey] = (testState.stats.errors[errorKey] || 0) + 1;
    
    // 添加错误日志（最多保留100条）
    testState.stats.errorLogs.unshift({
      time: new Date().toISOString(),
      message: errorMessage,
      statusCode: error.response?.status
    });
    if (testState.stats.errorLogs.length > 100) {
      testState.stats.errorLogs.pop();
    }
    
    // 添加请求日志
    addRequestLog({
      status: 'failure',
      responseTime,
      statusCode: error.response?.status,
      error: errorMessage,
      modelName: testState.config.modelName,
      requestType: testState.config.requestType
    });
    
    updateStats();
    return { success: false, error: errorMessage, responseTime };
  }
}

// 添加请求日志
function addRequestLog(logData) {
  const log = {
    time: new Date().toISOString(),
    status: logData.status,
    responseTime: logData.responseTime,
    statusCode: logData.statusCode,
    error: logData.error || null,
    modelName: logData.modelName,
    requestType: logData.requestType === 'stream' ? '流式' : '非流式',
    rpm: testState.currentRPM
  };
  
  testState.stats.requestLogs.unshift(log);
  
  // 只保留最近500条日志
  if (testState.stats.requestLogs.length > 500) {
    testState.stats.requestLogs.pop();
  }
  
  // 广播日志更新
  broadcast({
    type: 'requestLogUpdate',
    data: log
  });
}

// 清除请求日志
app.post('/api/clearLogs', authenticate, (req, res) => {
  testState.stats.requestLogs = [];
  broadcast({
    type: 'logsCleared'
  });
  res.json({ success: true, message: '日志已清除' });
});

// 更新当前分钟统计的成功率
function updateCurrentMinuteStats() {
  const total = testState.currentMinuteStats.totalRequests;
  if (total > 0) {
    testState.currentMinuteStats.successRate = ((testState.currentMinuteStats.successCount / total) * 100).toFixed(2);
    testState.currentMinuteStats.failureRate = ((testState.currentMinuteStats.failureCount / total) * 100).toFixed(2);
  }
  
  // 广播当前分钟统计更新
  broadcast({
    type: 'currentMinuteStatsUpdate',
    data: testState.currentMinuteStats
  });
}

// 记录每分钟统计（由定时器调用，每60秒执行一次）
function recordMinuteStats() {
  const now = Date.now();
  
  // 保存当前分钟的统计
  testState.stats.minuteStats.push({
    timestamp: testState.currentMinuteStats.timestamp,
    successCount: testState.currentMinuteStats.successCount,
    failureCount: testState.currentMinuteStats.failureCount,
    rpm: testState.currentRPM
  });
  
  // 记录日志 - 每分钟小总结
  const total = testState.currentMinuteStats.totalRequests;
  const successRate = total > 0 ? ((testState.currentMinuteStats.successCount / total) * 100).toFixed(2) : 100;
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 本分钟统计 [${new Date().toLocaleString('zh-CN')}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  当前RPM: ${testState.currentRPM}
  本分钟请求数: ${total}
  成功: ${testState.currentMinuteStats.successCount} | 失败: ${testState.currentMinuteStats.failureCount}
  成功率: ${successRate}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // 保留最近1440分钟（24小时）的数据
  if (testState.stats.minuteStats.length > 1440) {
    testState.stats.minuteStats.shift();
  }
  
  // 重置当前分钟统计
  testState.lastMinuteTime = now;
  testState.currentMinuteStats = {
    successCount: 0,
    failureCount: 0,
    timestamp: new Date(now).toISOString(),
    totalRequests: 0,
    successRate: 100,
    failureRate: 0
  };
  
  // 广播分钟统计更新
  broadcast({
    type: 'minuteStatsUpdate',
    data: testState.stats.minuteStats
  });
}

// 更新统计数据
function updateStats() {
  const total = testState.stats.totalRequests;
  if (total > 0) {
    testState.stats.successRate = ((testState.stats.successCount / total) * 100).toFixed(2);
    testState.stats.failureRate = ((testState.stats.failureCount / total) * 100).toFixed(2);
  }
  
  if (testState.stats.responseTimes.length > 0) {
    const sum = testState.stats.responseTimes.reduce((a, b) => a + b, 0);
    testState.stats.avgResponseTime = Math.round(sum / testState.stats.responseTimes.length);
  }
  
  // 广播更新
  broadcast({
    type: 'statsUpdate',
    data: testState
  });
}

// 检查是否承受不住
function checkOverload() {
  // 固定模式不检查过载，只按时间运行
  if (testState.mode === 'fixed') {
    return { overloaded: false };
  }
  
  const stats = testState.stats;
  const minuteStats = testState.currentMinuteStats;
  
  // 自动模式：使用当前分钟的成功率判定
  // 条件1: 当前分钟成功率低于阈值（至少有10个请求才判定）
  if (minuteStats.totalRequests >= 10 && minuteStats.successRate < config.stressTest.successThreshold) {
    return {
      overloaded: true,
      reason: `本分钟成功率(${minuteStats.successRate}%)低于阈值(${config.stressTest.successThreshold}%)`
    };
  }
  
  // 条件2: 连续失败次数过多
  if (stats.consecutiveFailures >= config.stressTest.maxConsecutiveFailures) {
    return {
      overloaded: true,
      reason: `连续失败${stats.consecutiveFailures}次，超过阈值(${config.stressTest.maxConsecutiveFailures})`
    };
  }
  
  // 条件3: 平均响应时间过长
  if (stats.responseTimes.length >= 10 && stats.avgResponseTime > config.stressTest.responseTimeThreshold) {
    return {
      overloaded: true,
      reason: `平均响应时间(${stats.avgResponseTime}ms)超过阈值(${config.stressTest.responseTimeThreshold}ms)`
    };
  }
  
  return { overloaded: false };
}

// 清除所有定时器
function clearAllTimers() {
  if (timers.requestTimer) {
    clearInterval(timers.requestTimer);
    timers.requestTimer = null;
  }
  if (timers.minuteStatsTimer) {
    clearInterval(timers.minuteStatsTimer);
    timers.minuteStatsTimer = null;
  }
  if (timers.rpmUpdateTimer) {
    clearInterval(timers.rpmUpdateTimer);
    timers.rpmUpdateTimer = null;
  }
  if (timers.durationTimer) {
    clearTimeout(timers.durationTimer);
    timers.durationTimer = null;
  }
}

// 主测压循环
function startStressTest() {
  const interval = 60000 / testState.targetRPM; // 每个请求的间隔时间（毫秒）
  
  // 输出开始测试日志
  const mode = testState.mode === 'auto' ? '自动测压' : '固定测压';
  const promptMode = testState.config.promptMode === 'random' ? '随机语句' : '固定语句';
  const requestType = testState.config.requestType === 'stream' ? '流式请求' : '非流式请求';
  const durationText = testState.config.testDuration > 0 ? `${testState.config.testDuration}分钟` : '不限时';
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🚀 开始测压测试                          ║
╚═══════════════════════════════════════════════════════════╝

⏰ 开始时间: ${new Date().toLocaleString('zh-CN')}

📋 测试配置:
  ├─ 测压模式: ${mode}
  ├─ 当前RPM: ${testState.currentRPM}
  ├─ 测试时长: ${durationText}
  ├─ 语句模式: ${promptMode}
  ├─ 请求类型: ${requestType}
  ├─ 模型名称: ${testState.config.modelName}
  └─ 目标地址: ${testState.config.url}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // 启动独立的分钟统计定时器，每60秒准时记录一次
  timers.minuteStatsTimer = setInterval(() => {
    if (!testState.isRunning) {
      clearInterval(timers.minuteStatsTimer);
      return;
    }
    recordMinuteStats();
  }, 60000);
  
  // 固定模式下，如果设置了测试时长，启动定时器
  if (testState.mode === 'fixed' && testState.config.testDuration > 0) {
    const durationMs = testState.config.testDuration * 60000; // 转换为毫秒
    timers.durationTimer = setTimeout(() => {
      testState.isRunning = false;
      clearAllTimers();
      
      printFinalSummary(`达到设定测试时长(${testState.config.testDuration}分钟)`);
      
      broadcast({
        type: 'testStopped',
        data: {
          reason: `达到设定测试时长(${testState.config.testDuration}分钟)`,
          finalStats: testState.stats
        }
      });
    }, durationMs);
  }
  
  timers.requestTimer = setInterval(async () => {
    if (!testState.isRunning) {
      clearAllTimers();
      printFinalSummary('手动停止');
      broadcast({
        type: 'testStopped',
        data: { reason: '手动停止', finalStats: testState.stats }
      });
      return;
    }
    
    // 检查是否需要更新间隔（RPM变化时）
    const newInterval = 60000 / testState.targetRPM;
    if (newInterval !== interval) {
      clearAllTimers();
      startStressTest(); // 重新启动以应用新的间隔
      return;
    }
    
    await executeRequest();
    
    // 检查是否过载（仅自动模式）
    const overloadCheck = checkOverload();
    if (overloadCheck.overloaded) {
      testState.isRunning = false;
      clearAllTimers();
      
      printFinalSummary(overloadCheck.reason, testState.currentRPM);
      
      broadcast({
        type: 'testStopped',
        data: {
          reason: overloadCheck.reason,
          finalStats: testState.stats,
          maxRPM: testState.currentRPM
        }
      });
    }
  }, interval);
  
  // 自动模式下的RPM递增
  if (testState.mode === 'auto') {
    timers.rpmUpdateTimer = setInterval(() => {
      if (!testState.isRunning) {
        clearInterval(timers.rpmUpdateTimer);
        return;
      }
      
      const { incrementRPM, incrementInterval, maxRPM } = config.stressTest.autoMode;
      const now = Date.now();
      
      if (now - testState.lastIncrementTime >= incrementInterval) {
        const newRPM = Math.min(testState.currentRPM + incrementRPM, maxRPM);
        
        if (newRPM !== testState.currentRPM) {
          testState.currentRPM = newRPM;
          testState.targetRPM = newRPM;
          testState.lastIncrementTime = now;
          
          // 记录RPM变化
          testState.stats.rpmHistory.push({
            time: new Date().toISOString(),
            rpm: newRPM
          });
          
          broadcast({
            type: 'rpmIncreased',
            data: { newRPM, time: new Date().toISOString() }
          });
          
          console.log(`\n⬆️  RPM已增加至: ${newRPM} [${new Date().toLocaleTimeString('zh-CN')}]\n`);
          
          // 重启测试以应用新的RPM
          clearAllTimers();
          startStressTest();
        }
        
        if (newRPM >= maxRPM) {
          console.log('\n⚠️  已达到最大RPM限制\n');
        }
      }
    }, 1000); // 每秒检查一次
  }
}

// 打印最终总结
function printFinalSummary(reason, maxRPM = null) {
  const duration = Date.now() - testState.startTime;
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  const totalTime = `${hours}小时${minutes}分${seconds}秒`;
  
  const stats = testState.stats;
  const avgResponseTimeSec = (stats.avgResponseTime / 1000).toFixed(2);
  
  // 错误统计前5
  const topErrors = Object.entries(stats.errors || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([msg, count]) => `    ${count}次: ${msg.substring(0, 60)}${msg.length > 60 ? '...' : ''}`)
    .join('\n');
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    ⏹️  测试已停止                           ║
╚═══════════════════════════════════════════════════════════╝

⏰ 停止时间: ${new Date().toLocaleString('zh-CN')}
📋 停止原因: ${reason}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 测试总结:

  运行时长: ${totalTime}
  测压模式: ${testState.mode === 'auto' ? '自动测压' : '固定测压'}
  ${maxRPM ? `最大RPM: ${maxRPM}` : `目标RPM: ${testState.currentRPM}`}
  
  📈 请求统计:
    ├─ 总请求数: ${stats.totalRequests.toLocaleString()}
    ├─ 成功次数: ${stats.successCount.toLocaleString()}
    ├─ 失败次数: ${stats.failureCount.toLocaleString()}
    ├─ 总体成功率: ${stats.successRate}%
    └─ 平均响应时间: ${avgResponseTimeSec}秒
  
  ${topErrors ? `⚠️  主要错误类型:\n${topErrors}\n` : '✅ 无错误发生'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // 保存历史记录到数据库
  saveTestHistory(reason, maxRPM);
}

// 保存测试历史到数据库
function saveTestHistory(stopReason, maxRPM = null) {
  try {
    const historyData = {
      startTime: new Date(testState.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - testState.startTime,
      testUrl: testState.config.url,
      modelName: testState.config.modelName,
      testMode: testState.mode,
      promptMode: testState.config.promptMode,
      requestType: testState.config.requestType,
      targetRPM: testState.targetRPM,
      maxRPM: maxRPM,
      totalRequests: testState.stats.totalRequests,
      successCount: testState.stats.successCount,
      failureCount: testState.stats.failureCount,
      successRate: parseFloat(testState.stats.successRate),
      avgResponseTime: testState.stats.avgResponseTime,
      stopReason: stopReason,
      minuteStats: testState.stats.minuteStats,
      errorSummary: testState.stats.errors
    };
    
    const historyId = db.saveHistory(historyData);
    console.log(`✅ 测试历史已保存到数据库 (ID: ${historyId})`);
  } catch (error) {
    console.error('❌ 保存测试历史失败:', error);
  }
}

// 提供前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'detail.html'));
});

// 获取历史记录列表
app.get('/api/history', authenticate, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = db.getHistoryList(page, pageSize);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取历史记录失败：' + error.message });
  }
});

// 获取单条历史记录详情
app.get('/api/history/:id', authenticate, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const detail = db.getHistoryDetail(id);
    if (!detail) {
      return res.status(404).json({ error: '历史记录不存在' });
    }
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: '获取历史详情失败：' + error.message });
  }
});

// 删除历史记录
app.delete('/api/history/:id', authenticate, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = db.deleteHistory(id);
    if (success) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ error: '历史记录不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: '删除失败：' + error.message });
  }
});

// 清空所有历史记录
app.post('/api/history/clear', authenticate, (req, res) => {
  try {
    db.clearAllHistory();
    res.json({ success: true, message: '所有历史记录已清空' });
  } catch (error) {
    res.status(500).json({ error: '清空失败：' + error.message });
  }
});

// 启动服务器
server.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   自动测压系统 - AutoCeya                   ║
║   Gemini API压力测试工具                    ║
╚════════════════════════════════════════════╝

✓ 服务器运行在: http://localhost:${config.port}
✓ WebSocket连接: ws://localhost:${config.port}

⚠️  请在 .env 文件中设置 AUTH_SECRET 密钥
  `);
});

