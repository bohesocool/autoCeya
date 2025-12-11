/**
 * 内存监控类
 * 用于监控和管理系统内存使用
 */
const logger = require('./logger');

class MemoryMonitor {
  /**
   * 创建内存监控器
   * @param {Object} options - 配置选项
   * @param {number} options.warningThreshold - 警告阈值（字节），默认 500MB
   * @param {number} options.criticalThreshold - 临界阈值（字节），默认 800MB
   * @param {number} options.checkInterval - 检查间隔（毫秒），默认 30000（30秒）
   * @param {Function} options.onWarning - 警告回调函数
   * @param {Function} options.onCritical - 临界回调函数
   */
  constructor(options = {}) {
    const MB = 1024 * 1024;
    this._warningThreshold = options.warningThreshold || 500 * MB;
    this._criticalThreshold = options.criticalThreshold || 800 * MB;
    this._checkInterval = options.checkInterval || 30000;
    this._onWarning = options.onWarning || null;
    this._onCritical = options.onCritical || null;
    this._intervalId = null;
    this._isRunning = false;
  }

  /**
   * 启动定期监控
   */
  start() {
    if (this._isRunning) {
      return;
    }
    
    this._isRunning = true;
    this._intervalId = setInterval(() => {
      this.check();
    }, this._checkInterval);
    
    // 立即执行一次检查
    this.check();
    
    logger.info('内存监控已启动', {
      warningThreshold: `${Math.round(this._warningThreshold / (1024 * 1024))}MB`,
      criticalThreshold: `${Math.round(this._criticalThreshold / (1024 * 1024))}MB`,
      checkInterval: `${this._checkInterval / 1000}秒`
    });
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this._isRunning) {
      return;
    }
    
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    
    this._isRunning = false;
    logger.info('内存监控已停止');
  }

  /**
   * 获取当前内存使用情况
   * @returns {Object} 内存使用统计
   */
  getMemoryUsage() {
    try {
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
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('获取内存信息失败', { error: error.message });
      return null;
    }
  }

  /**
   * 手动触发内存检查
   * @returns {Object} 检查结果，包含内存使用情况和状态
   */
  check() {
    const memUsage = this.getMemoryUsage();
    
    if (!memUsage) {
      return { status: 'error', message: '无法获取内存信息' };
    }
    
    const heapUsed = memUsage.heapUsed;
    let status = 'normal';
    
    // 检查是否超过临界阈值
    if (heapUsed >= this._criticalThreshold) {
      status = 'critical';
      logger.warn('⚠️ 内存使用超过临界阈值', {
        heapUsedMB: memUsage.heapUsedMB,
        thresholdMB: Math.round(this._criticalThreshold / (1024 * 1024))
      });
      
      // 触发内存清理机制
      this._triggerCleanup();
      
      if (this._onCritical) {
        this._onCritical(memUsage);
      }
    }
    // 检查是否超过警告阈值
    else if (heapUsed >= this._warningThreshold) {
      status = 'warning';
      logger.warn('⚠️ 内存使用超过警告阈值', {
        heapUsedMB: memUsage.heapUsedMB,
        thresholdMB: Math.round(this._warningThreshold / (1024 * 1024))
      });
      
      if (this._onWarning) {
        this._onWarning(memUsage);
      }
    }
    
    return {
      status,
      memory: memUsage
    };
  }

  /**
   * 触发内存清理机制
   * @private
   */
  _triggerCleanup() {
    try {
      // 建议 V8 进行垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
        logger.info('已触发垃圾回收');
      }
    } catch (error) {
      logger.error('触发垃圾回收失败', { error: error.message });
    }
  }

  /**
   * 检查监控是否正在运行
   * @returns {boolean} 是否正在运行
   */
  isRunning() {
    return this._isRunning;
  }

  /**
   * 获取警告阈值
   * @returns {number} 警告阈值（字节）
   */
  get warningThreshold() {
    return this._warningThreshold;
  }

  /**
   * 获取临界阈值
   * @returns {number} 临界阈值（字节）
   */
  get criticalThreshold() {
    return this._criticalThreshold;
  }

  /**
   * 获取检查间隔
   * @returns {number} 检查间隔（毫秒）
   */
  get checkInterval() {
    return this._checkInterval;
  }
}

module.exports = MemoryMonitor;
