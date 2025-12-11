/**
 * ParallelController - 并行测试控制器
 * 处理并行测试相关的 API 请求
 * 
 * 需求: 6.1, 6.2, 6.3
 */
const parallelTestService = require('../services/parallelTestService');

/**
 * 启动并行测试
 * POST /api/parallel/start
 * 
 * 需求 6.1: WHEN 调用 POST /api/parallel/start THEN 系统 SHALL 启动并行测试
 */
const startParallelTest = (req, res) => {
  const { configs } = req.body;
  
  if (!configs) {
    return res.status(400).json({
      success: false,
      message: '缺少测试配置',
    });
  }

  const status = parallelTestService.start(configs);
  res.status(201).json({
    success: true,
    message: '并行测试已启动',
    data: status,
  });
};

/**
 * 停止所有并行测试
 * POST /api/parallel/stop
 * 
 * 需求 6.2: WHEN 调用 POST /api/parallel/stop THEN 系统 SHALL 停止所有并行测试
 */
const stopParallelTest = (req, res) => {
  const status = parallelTestService.stop();
  res.json({
    success: true,
    message: '并行测试已停止',
    data: status,
  });
};

/**
 * 获取所有并行测试状态
 * GET /api/parallel/status
 * 
 * 需求 6.3: WHEN 调用 GET /api/parallel/status THEN 系统 SHALL 返回所有并行测试的状态
 */
const getParallelStatus = (req, res) => {
  const status = parallelTestService.getStatus();
  res.json({
    success: true,
    data: status,
  });
};

module.exports = {
  startParallelTest,
  stopParallelTest,
  getParallelStatus,
};
