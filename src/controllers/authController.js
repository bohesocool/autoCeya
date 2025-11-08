const config = require('../config');
const { AppError } = require('../middlewares/errorHandler');
const log = require('../utils/logger');

/**
 * 登录控制器
 */
const login = (req, res) => {
  const { password } = req.body;

  if (password === config.authSecret) {
    log.info('用户登录成功', { ip: req.ip });
    
    res.json({
      success: true,
      token: config.authSecret,
      message: '登录成功',
    });
  } else {
    log.warn('登录失败：密码错误', { ip: req.ip });
    throw new AppError('密码错误', 401);
  }
};

module.exports = {
  login,
};


