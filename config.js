// 兼容性配置文件 - 保持旧版 server.js 能正常工作
// 新代码请使用 src/config/index.js
require('dotenv').config();

module.exports = {
  // 服务器配置
  port: process.env.PORT || 8998,
  authSecret: process.env.AUTH_SECRET || 'change_this_password',
  
  // 测压配置
  stressTest: {
    // 成功率阈值（低于此值判定为承受不住）
    successThreshold: parseInt(process.env.DEFAULT_SUCCESS_THRESHOLD) || 80,
    
    // 最大连续失败次数
    maxConsecutiveFailures: parseInt(process.env.DEFAULT_MAX_FAILURES) || 10,
    
    // 响应时间阈值（毫秒）
    responseTimeThreshold: parseInt(process.env.DEFAULT_RESPONSE_TIME_THRESHOLD) || 150000,
    
    // 自动模式下RPM增长设置
    autoMode: {
      initialRPM: 10,           // 起始RPM
      incrementRPM: 10,         // 每次增加的RPM
      incrementInterval: 60000, // 增长间隔（毫秒）1分钟
      maxRPM: 1000             // 最大RPM限制
    }
  }
};

