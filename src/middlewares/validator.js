const { AppError } = require('./errorHandler');

/**
 * 验证成功率阈值
 * @param {*} value - 输入值
 * @returns {{ valid: boolean, error?: string }} - 验证结果
 */
const validateSuccessThreshold = (value) => {
  if (value === undefined || value === null) {
    return { valid: true };
  }
  const threshold = Number(value);
  if (isNaN(threshold) || threshold < 0 || threshold > 100) {
    return { valid: false, error: '成功率阈值必须在0-100之间' };
  }
  return { valid: true };
};

/**
 * 验证最大连续失败次数
 * @param {*} value - 输入值
 * @returns {{ valid: boolean, error?: string }} - 验证结果
 */
const validateMaxFailures = (value) => {
  if (value === undefined || value === null) {
    return { valid: true };
  }
  const failures = Number(value);
  if (isNaN(failures) || failures < 0 || !Number.isInteger(failures)) {
    return { valid: false, error: '最大连续失败次数必须为非负整数' };
  }
  return { valid: true };
};

/**
 * 验证测试启动参数
 */
const validateStartTest = (req, res, next) => {
  const { mode, rpm, url, modelName, apiKey, testPrompt, promptMode, randomPrompts, providerType } = req.body;

  // 验证必填字段
  if (!url || !url.trim()) {
    throw new AppError('URL不能为空', 400);
  }

  if (!modelName || !modelName.trim()) {
    throw new AppError('模型名称不能为空', 400);
  }

  if (!apiKey || !apiKey.trim()) {
    throw new AppError('API密钥不能为空', 400);
  }

  if (!providerType || !['gemini', 'openai', 'claude'].includes(providerType)) {
    throw new AppError('必须指定有效的AI提供商类型（gemini/openai/claude）', 400);
  }

  // 验证 URL 格式
  try {
    new URL(url);
  } catch (e) {
    throw new AppError('URL格式无效', 400);
  }

  // 验证测压模式
  if (mode && !['fixed', 'auto'].includes(mode)) {
    throw new AppError('测压模式必须是 fixed 或 auto', 400);
  }

  // 验证 RPM
  if (mode === 'fixed' && (!rpm || rpm < 1 || rpm > 100000)) {
    throw new AppError('固定模式下RPM必须在1-100000之间', 400);
  }

  // 验证测试语句模式
  if (promptMode && !['fixed', 'random'].includes(promptMode)) {
    throw new AppError('测试语句模式必须是 fixed 或 random', 400);
  }

  if (promptMode === 'fixed' && !testPrompt) {
    throw new AppError('固定模式下请填写测试语句', 400);
  }

  if (promptMode === 'random' && (!randomPrompts || randomPrompts.length === 0)) {
    throw new AppError('随机模式下请至少添加一条测试语句', 400);
  }

  // 验证阈值参数（仅自动模式需要）
  if (mode === 'auto') {
    const { successThreshold, maxFailures } = req.body;

    // 验证成功率阈值
    const thresholdResult = validateSuccessThreshold(successThreshold);
    if (!thresholdResult.valid) {
      throw new AppError(thresholdResult.error, 400);
    }

    // 验证最大连续失败次数
    const failuresResult = validateMaxFailures(maxFailures);
    if (!failuresResult.valid) {
      throw new AppError(failuresResult.error, 400);
    }
  }

  next();
};

/**
 * 验证分页参数
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;

  if (page < 1) {
    throw new AppError('页码必须大于0', 400);
  }

  if (pageSize < 1 || pageSize > 100) {
    throw new AppError('每页数量必须在1-100之间', 400);
  }

  req.query.page = page;
  req.query.pageSize = pageSize;

  next();
};

/**
 * 验证 ID 参数
 */
const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id < 1) {
    throw new AppError('无效的ID参数', 400);
  }

  req.params.id = id;
  next();
};

/**
 * 验证登录参数
 */
const validateLogin = (req, res, next) => {
  const { password } = req.body;

  if (!password || !password.trim()) {
    throw new AppError('密码不能为空', 400);
  }

  if (password.length < 6) {
    throw new AppError('密码长度至少为6位', 400);
  }

  next();
};

module.exports = {
  validateStartTest,
  validatePagination,
  validateId,
  validateLogin,
  // 导出纯验证函数用于测试
  validateSuccessThreshold,
  validateMaxFailures,
};


