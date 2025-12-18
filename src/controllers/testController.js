const stressTestService = require('../services/stressTestService');
const { AppError } = require('../middlewares/errorHandler');

/**
 * 启动测压
 */
const startTest = (req, res) => {
  const result = stressTestService.start(req.body);
  res.json(result);
};

/**
 * 停止测压
 */
const stopTest = (req, res) => {
  const result = stressTestService.stop();
  res.json(result);
};

/**
 * 获取当前状态
 */
const getStatus = (req, res) => {
  const state = stressTestService.getState();
  res.json(state);
};

/**
 * 清除请求日志
 */
const clearLogs = (req, res) => {
  stressTestService.clearRequestLogs();
  res.json({ success: true, message: '日志已清除' });
};

module.exports = {
  startTest,
  stopTest,
  getStatus,
  clearLogs,
};


