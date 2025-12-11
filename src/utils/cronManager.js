/**
 * CronManager - Cron 表达式管理器
 * 负责解析和调度定时任务
 */
const cron = require('node-cron');
const logger = require('./logger');

class CronManager {
  constructor() {
    // 存储所有活跃的 cron 任务
    this.jobs = new Map();
    // 任务执行回调
    this.onExecute = null;
    // 是否已启动
    this.isRunning = false;
  }

  /**
   * 设置任务执行回调
   * @param {Function} callback - 任务执行时的回调函数
   */
  setExecuteCallback(callback) {
    this.onExecute = callback;
  }

  /**
   * 启动调度器
   */
  start() {
    if (this.isRunning) {
      logger.warn('CronManager 已经在运行中');
      return;
    }
    this.isRunning = true;
    logger.info('CronManager 已启动');
  }

  /**
   * 停止调度器
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('CronManager 未在运行');
      return;
    }
    
    // 停止所有任务
    for (const [id, job] of this.jobs) {
      job.stop();
      logger.info(`定时任务 ${id} 已停止`);
    }
    
    this.isRunning = false;
    logger.info('CronManager 已停止');
  }

  /**
   * 添加定时任务
   * @param {Object} schedule - 任务配置
   * @param {number} schedule.id - 任务 ID
   * @param {string} schedule.cronExpression - Cron 表达式
   * @param {string} schedule.scheduleType - 任务类型 ('once' | 'recurring')
   * @param {string} schedule.runAt - 一次性执行时间 (ISO 8601)
   */
  addJob(schedule) {
    const { id, cronExpression, scheduleType, runAt } = schedule;

    // 如果任务已存在，先移除
    if (this.jobs.has(id)) {
      this.removeJob(id);
    }

    if (scheduleType === 'once') {
      // 一次性任务：使用 setTimeout
      this._addOnceJob(schedule);
    } else if (scheduleType === 'recurring') {
      // 重复任务：使用 cron
      this._addRecurringJob(schedule);
    }
  }

  /**
   * 添加一次性任务
   * @private
   */
  _addOnceJob(schedule) {
    const { id, runAt } = schedule;
    const runTime = new Date(runAt);
    const now = new Date();
    const delay = runTime.getTime() - now.getTime();

    if (delay <= 0) {
      logger.warn(`定时任务 ${id} 的执行时间已过期`);
      return;
    }

    const timeoutId = setTimeout(async () => {
      logger.info(`一次性任务 ${id} 开始执行`);
      if (this.onExecute) {
        await this.onExecute(id);
      }
      // 执行完成后移除任务
      this.jobs.delete(id);
    }, delay);

    // 存储 timeout 引用，以便可以取消
    this.jobs.set(id, {
      type: 'once',
      timeoutId,
      stop: () => clearTimeout(timeoutId)
    });

    logger.info(`一次性任务 ${id} 已添加，将在 ${runAt} 执行`);
  }

  /**
   * 添加重复任务
   * @private
   */
  _addRecurringJob(schedule) {
    const { id, cronExpression } = schedule;

    if (!this.validateCron(cronExpression)) {
      logger.error(`无效的 Cron 表达式: ${cronExpression}`);
      throw new Error(`无效的 Cron 表达式: ${cronExpression}`);
    }

    const job = cron.schedule(cronExpression, async () => {
      logger.info(`重复任务 ${id} 开始执行`);
      if (this.onExecute) {
        await this.onExecute(id);
      }
    }, {
      scheduled: this.isRunning
    });

    this.jobs.set(id, job);
    logger.info(`重复任务 ${id} 已添加，Cron: ${cronExpression}`);
  }

  /**
   * 移除定时任务
   * @param {number} id - 任务 ID
   */
  removeJob(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
      logger.info(`定时任务 ${id} 已移除`);
      return true;
    }
    return false;
  }

  /**
   * 计算下次执行时间
   * @param {string} cronExpression - Cron 表达式
   * @returns {Date|null} 下次执行时间，无效表达式返回 null
   */
  getNextRunTime(cronExpression) {
    if (!this.validateCron(cronExpression)) {
      return null;
    }

    // 解析 cron 表达式并计算下次执行时间
    const parts = cronExpression.trim().split(/\s+/);
    const now = new Date();
    
    // 创建一个新的日期对象用于计算
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // 解析各个字段（支持 5 字段和 6 字段格式）
    let minute, hour, dayOfMonth, month, dayOfWeek;
    if (parts.length === 6) {
      // 6 字段格式：秒 分 时 日 月 周
      [, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    } else {
      // 5 字段格式：分 时 日 月 周
      [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    }

    // 简化实现：找到下一个匹配的时间点
    // 最多检查未来两年的时间（处理特殊日期如 2 月 29 日）
    const maxIterations = 366 * 2 * 24 * 60; // 两年的分钟数
    
    for (let i = 0; i < maxIterations; i++) {
      next.setMinutes(next.getMinutes() + 1);
      
      if (this._matchesCron(next, minute, hour, dayOfMonth, month, dayOfWeek)) {
        return next;
      }
    }

    return null;
  }

  /**
   * 检查时间是否匹配 cron 表达式
   * @private
   * 
   * 注意：标准 cron 行为 - 当日期和星期都不是 '*' 时，
   * 满足任一条件即可触发（OR 逻辑），而不是 AND 逻辑
   */
  _matchesCron(date, minute, hour, dayOfMonth, month, dayOfWeek) {
    // 星期字段特殊处理：0 和 7 都表示星期日
    const dayOfWeekValue = date.getDay();
    
    // 基本字段必须匹配
    const minuteMatch = this._matchesField(date.getMinutes(), minute, 0, 59);
    const hourMatch = this._matchesField(date.getHours(), hour, 0, 23);
    const monthMatch = this._matchesField(date.getMonth() + 1, month, 1, 12);
    
    if (!minuteMatch || !hourMatch || !monthMatch) {
      return false;
    }
    
    // 日期和星期的特殊处理
    const dayOfMonthMatch = this._matchesField(date.getDate(), dayOfMonth, 1, 31);
    const dayOfWeekMatch = this._matchesDayOfWeek(dayOfWeekValue, dayOfWeek);
    
    // 如果日期和星期都是 '*'，则匹配
    if (dayOfMonth === '*' && dayOfWeek === '*') {
      return true;
    }
    
    // 如果只有日期是 '*'，则只检查星期
    if (dayOfMonth === '*') {
      return dayOfWeekMatch;
    }
    
    // 如果只有星期是 '*'，则只检查日期
    if (dayOfWeek === '*') {
      return dayOfMonthMatch;
    }
    
    // 如果两者都不是 '*'，则满足任一条件即可（OR 逻辑）
    return dayOfMonthMatch || dayOfWeekMatch;
  }

  /**
   * 检查星期是否匹配（特殊处理 0 和 7 都表示星期日）
   * @private
   */
  _matchesDayOfWeek(value, field) {
    // 通配符
    if (field === '*') {
      return true;
    }

    // 将 7 转换为 0（都表示星期日）
    const normalizedValue = value === 7 ? 0 : value;

    // 列表 (例如: 0,1,2)
    if (field.includes(',')) {
      const values = field.split(',').map(v => {
        const num = parseInt(v.trim(), 10);
        return num === 7 ? 0 : num;
      });
      return values.includes(normalizedValue);
    }

    // 范围 (例如: 1-5)
    if (field.includes('-') && !field.includes('/')) {
      let [start, end] = field.split('-').map(v => parseInt(v.trim(), 10));
      start = start === 7 ? 0 : start;
      end = end === 7 ? 0 : end;
      if (start <= end) {
        return normalizedValue >= start && normalizedValue <= end;
      }
      // 跨周的范围（如 5-1 表示周五到周一）
      return normalizedValue >= start || normalizedValue <= end;
    }

    // 步进 (例如: */2)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = parseInt(step, 10);
      if (range === '*') {
        return normalizedValue % stepNum === 0;
      }
    }

    // 精确值
    let fieldValue = parseInt(field, 10);
    fieldValue = fieldValue === 7 ? 0 : fieldValue;
    return fieldValue === normalizedValue;
  }

  /**
   * 检查值是否匹配 cron 字段
   * @private
   */
  _matchesField(value, field, min, max) {
    // 通配符
    if (field === '*') {
      return true;
    }

    // 列表 (例如: 1,2,3)
    if (field.includes(',')) {
      const values = field.split(',').map(v => parseInt(v.trim(), 10));
      return values.includes(value);
    }

    // 范围 (例如: 1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(v => parseInt(v.trim(), 10));
      return value >= start && value <= end;
    }

    // 步进 (例如: */5)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = parseInt(step, 10);
      if (range === '*') {
        return value % stepNum === 0;
      }
      // 范围步进 (例如: 0-30/5)
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(v => parseInt(v.trim(), 10));
        return value >= start && value <= end && (value - start) % stepNum === 0;
      }
    }

    // 精确值
    return parseInt(field, 10) === value;
  }

  /**
   * 验证 Cron 表达式
   * @param {string} cronExpression - Cron 表达式
   * @returns {boolean} 是否有效
   */
  validateCron(cronExpression) {
    if (!cronExpression || typeof cronExpression !== 'string') {
      return false;
    }
    return cron.validate(cronExpression);
  }

  /**
   * 获取所有活跃任务的 ID
   * @returns {number[]} 任务 ID 数组
   */
  getActiveJobIds() {
    return Array.from(this.jobs.keys());
  }

  /**
   * 检查任务是否存在
   * @param {number} id - 任务 ID
   * @returns {boolean}
   */
  hasJob(id) {
    return this.jobs.has(id);
  }
}

// 导出单例
module.exports = new CronManager();
