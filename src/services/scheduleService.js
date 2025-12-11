/**
 * ScheduleService - 定时任务服务
 * 管理定时任务的创建、执行和调度
 */
const db = require('../../database');
const cronManager = require('../utils/cronManager');
const stressTestService = require('./stressTestService');
const logger = require('../utils/logger');

class ScheduleService {
  constructor() {
    // 初始化时设置 CronManager 的执行回调
    cronManager.setExecuteCallback(this.execute.bind(this));
  }

  /**
   * 初始化服务
   * 加载所有启用的定时任务到调度器
   */
  init() {
    try {
      cronManager.start();
      const enabledSchedules = db.getEnabledSchedules();
      
      for (const schedule of enabledSchedules) {
        try {
          this._addJobToCronManager(schedule);
        } catch (error) {
          logger.error(`加载定时任务 ${schedule.id} 失败`, { error: error.message });
        }
      }
      
      logger.info(`定时任务服务已初始化，加载了 ${enabledSchedules.length} 个任务`);
    } catch (error) {
      logger.error('初始化定时任务服务失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 创建定时任务
   * @param {Object} config - 任务配置
   * @returns {Object} 创建的任务
   */
  create(config) {
    // 验证必填字段
    if (!config.name || !config.name.trim()) {
      throw new Error('任务名称不能为空');
    }
    
    if (!config.testConfig) {
      throw new Error('测试配置不能为空');
    }
    
    if (!config.scheduleType || !['once', 'recurring'].includes(config.scheduleType)) {
      throw new Error('调度类型必须是 once 或 recurring');
    }
    
    // 验证调度配置
    if (config.scheduleType === 'once') {
      if (!config.runAt) {
        throw new Error('一次性任务必须指定执行时间');
      }
      const runTime = new Date(config.runAt);
      if (isNaN(runTime.getTime())) {
        throw new Error('执行时间格式无效');
      }
      if (runTime.getTime() <= Date.now()) {
        throw new Error('执行时间必须是未来时间');
      }
    } else if (config.scheduleType === 'recurring') {
      if (!config.cronExpression) {
        throw new Error('重复任务必须指定 Cron 表达式');
      }
      if (!cronManager.validateCron(config.cronExpression)) {
        throw new Error('无效的 Cron 表达式');
      }
    }

    // 计算下次执行时间
    let nextRunAt = null;
    if (config.scheduleType === 'once') {
      nextRunAt = config.runAt;
    } else if (config.scheduleType === 'recurring') {
      const nextTime = cronManager.getNextRunTime(config.cronExpression);
      nextRunAt = nextTime ? nextTime.toISOString() : null;
    }

    // 保存到数据库
    const scheduleData = {
      name: config.name.trim(),
      description: config.description || null,
      testConfig: config.testConfig,
      scheduleType: config.scheduleType,
      runAt: config.runAt || null,
      cronExpression: config.cronExpression || null,
      enabled: config.enabled !== false,
      nextRunAt,
    };

    const id = db.createSchedule(scheduleData);
    const schedule = db.getScheduleById(id);

    // 如果任务启用，添加到调度器
    if (schedule.enabled) {
      this._addJobToCronManager(schedule);
    }

    logger.info(`定时任务已创建`, { id, name: schedule.name });
    return schedule;
  }

  /**
   * 获取所有定时任务
   * @returns {Array} 任务列表
   */
  getAll() {
    return db.getAllSchedules();
  }

  /**
   * 获取单个任务详情
   * @param {number} id - 任务 ID
   * @returns {Object} 任务详情
   */
  getById(id) {
    const schedule = db.getScheduleById(id);
    if (!schedule) {
      throw new Error('任务不存在');
    }
    return schedule;
  }

  /**
   * 更新任务配置
   * @param {number} id - 任务 ID
   * @param {Object} config - 新配置
   * @returns {Object} 更新后的任务
   */
  update(id, config) {
    // 检查任务是否存在
    const existingSchedule = db.getScheduleById(id);
    if (!existingSchedule) {
      throw new Error('任务不存在');
    }

    // 验证必填字段
    if (config.name !== undefined && !config.name.trim()) {
      throw new Error('任务名称不能为空');
    }

    // 验证调度配置
    const scheduleType = config.scheduleType || existingSchedule.scheduleType;
    
    if (scheduleType === 'once') {
      const runAt = config.runAt !== undefined ? config.runAt : existingSchedule.runAt;
      if (!runAt) {
        throw new Error('一次性任务必须指定执行时间');
      }
      const runTime = new Date(runAt);
      if (isNaN(runTime.getTime())) {
        throw new Error('执行时间格式无效');
      }
    } else if (scheduleType === 'recurring') {
      const cronExpression = config.cronExpression !== undefined 
        ? config.cronExpression 
        : existingSchedule.cronExpression;
      if (!cronExpression) {
        throw new Error('重复任务必须指定 Cron 表达式');
      }
      if (!cronManager.validateCron(cronExpression)) {
        throw new Error('无效的 Cron 表达式');
      }
    }

    // 计算下次执行时间
    let nextRunAt = existingSchedule.nextRunAt;
    if (config.scheduleType || config.runAt || config.cronExpression) {
      if (scheduleType === 'once') {
        nextRunAt = config.runAt || existingSchedule.runAt;
      } else if (scheduleType === 'recurring') {
        const cronExpr = config.cronExpression || existingSchedule.cronExpression;
        const nextTime = cronManager.getNextRunTime(cronExpr);
        nextRunAt = nextTime ? nextTime.toISOString() : null;
      }
    }

    // 合并配置
    const updateData = {
      name: config.name !== undefined ? config.name.trim() : existingSchedule.name,
      description: config.description !== undefined ? config.description : existingSchedule.description,
      testConfig: config.testConfig !== undefined ? config.testConfig : existingSchedule.testConfig,
      scheduleType,
      runAt: scheduleType === 'once' 
        ? (config.runAt !== undefined ? config.runAt : existingSchedule.runAt) 
        : null,
      cronExpression: scheduleType === 'recurring' 
        ? (config.cronExpression !== undefined ? config.cronExpression : existingSchedule.cronExpression) 
        : null,
      enabled: config.enabled !== undefined ? config.enabled : existingSchedule.enabled,
      nextRunAt,
    };

    // 更新数据库
    db.updateSchedule(id, updateData);
    const updatedSchedule = db.getScheduleById(id);

    // 更新调度器
    cronManager.removeJob(id);
    if (updatedSchedule.enabled) {
      this._addJobToCronManager(updatedSchedule);
    }

    logger.info(`定时任务已更新`, { id, name: updatedSchedule.name });
    return updatedSchedule;
  }

  /**
   * 删除任务
   * @param {number} id - 任务 ID
   */
  delete(id) {
    // 检查任务是否存在
    const schedule = db.getScheduleById(id);
    if (!schedule) {
      throw new Error('任务不存在');
    }

    // 从调度器移除
    cronManager.removeJob(id);

    // 从数据库删除
    db.deleteSchedule(id);

    logger.info(`定时任务已删除`, { id, name: schedule.name });
  }

  /**
   * 切换任务启用状态
   * @param {number} id - 任务 ID
   * @returns {Object} 更新后的任务
   */
  toggle(id) {
    // 检查任务是否存在
    const existingSchedule = db.getScheduleById(id);
    if (!existingSchedule) {
      throw new Error('任务不存在');
    }

    // 切换状态
    const updatedSchedule = db.toggleSchedule(id);
    if (!updatedSchedule) {
      throw new Error('切换任务状态失败');
    }

    // 更新调度器
    if (updatedSchedule.enabled) {
      // 重新计算下次执行时间
      let nextRunAt = null;
      if (updatedSchedule.scheduleType === 'once') {
        nextRunAt = updatedSchedule.runAt;
      } else if (updatedSchedule.scheduleType === 'recurring') {
        const nextTime = cronManager.getNextRunTime(updatedSchedule.cronExpression);
        nextRunAt = nextTime ? nextTime.toISOString() : null;
      }
      
      // 更新下次执行时间
      if (nextRunAt !== updatedSchedule.nextRunAt) {
        db.updateScheduleRunTime(id, updatedSchedule.lastRunAt, nextRunAt);
        updatedSchedule.nextRunAt = nextRunAt;
      }
      
      this._addJobToCronManager(updatedSchedule);
      logger.info(`定时任务已启用`, { id, name: updatedSchedule.name });
    } else {
      cronManager.removeJob(id);
      logger.info(`定时任务已禁用`, { id, name: updatedSchedule.name });
    }

    return updatedSchedule;
  }


  /**
   * 执行任务
   * @param {number} id - 任务 ID
   */
  async execute(id) {
    const schedule = db.getScheduleById(id);
    if (!schedule) {
      logger.error(`执行定时任务失败：任务不存在`, { id });
      return;
    }

    logger.info(`开始执行定时任务`, { id, name: schedule.name });

    try {
      // 检查是否有正在运行的测试
      const currentState = stressTestService.getState();
      if (currentState.isRunning) {
        logger.warn(`定时任务执行跳过：已有测试在运行`, { id, name: schedule.name });
        return;
      }

      // 启动压力测试
      const testConfig = schedule.testConfig;
      stressTestService.start(testConfig);

      // 更新执行时间
      const now = new Date().toISOString();
      let nextRunAt = null;
      
      if (schedule.scheduleType === 'recurring') {
        const nextTime = cronManager.getNextRunTime(schedule.cronExpression);
        nextRunAt = nextTime ? nextTime.toISOString() : null;
      }
      
      db.updateScheduleRunTime(id, now, nextRunAt);

      logger.info(`定时任务执行成功`, { id, name: schedule.name });
    } catch (error) {
      logger.error(`定时任务执行失败`, { id, name: schedule.name, error: error.message });
    }
  }

  /**
   * 将任务添加到 CronManager
   * @private
   */
  _addJobToCronManager(schedule) {
    if (schedule.scheduleType === 'once') {
      // 检查一次性任务是否已过期
      const runTime = new Date(schedule.runAt);
      if (runTime.getTime() <= Date.now()) {
        logger.warn(`一次性任务已过期，跳过添加`, { id: schedule.id, runAt: schedule.runAt });
        return;
      }
    }

    cronManager.addJob({
      id: schedule.id,
      cronExpression: schedule.cronExpression,
      scheduleType: schedule.scheduleType,
      runAt: schedule.runAt,
    });
  }

  /**
   * 停止服务
   */
  shutdown() {
    cronManager.stop();
    logger.info('定时任务服务已停止');
  }
}

// 导出单例
module.exports = new ScheduleService();
