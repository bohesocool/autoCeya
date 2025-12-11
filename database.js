const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');

// 使用配置文件中的数据库路径
const dbPath = path.resolve(config.database.path);
const dbDir = path.dirname(dbPath);

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`数据库目录已创建: ${dbDir}`);
}

// 创建或打开数据库
console.log(`数据库路径: ${dbPath}`);
const db = new Database(dbPath);
console.log('数据库连接成功');

// 创建历史记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS test_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    test_url TEXT NOT NULL,
    model_name TEXT NOT NULL,
    test_mode TEXT NOT NULL,
    prompt_mode TEXT NOT NULL,
    request_type TEXT NOT NULL,
    target_rpm INTEGER NOT NULL,
    max_rpm INTEGER,
    total_requests INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    failure_count INTEGER NOT NULL,
    success_rate REAL NOT NULL,
    avg_response_time INTEGER NOT NULL,
    stop_reason TEXT,
    minute_stats TEXT,
    error_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建定时任务表
db.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    test_config TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    run_at TEXT,
    cron_expression TEXT,
    enabled INTEGER DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// 插入测试记录
const insertHistory = db.prepare(`
  INSERT INTO test_history (
    start_time, end_time, duration, test_url, model_name, 
    test_mode, prompt_mode, request_type, target_rpm, max_rpm,
    total_requests, success_count, failure_count, success_rate,
    avg_response_time, stop_reason, minute_stats, error_summary
  ) VALUES (
    @start_time, @end_time, @duration, @test_url, @model_name,
    @test_mode, @prompt_mode, @request_type, @target_rpm, @max_rpm,
    @total_requests, @success_count, @failure_count, @success_rate,
    @avg_response_time, @stop_reason, @minute_stats, @error_summary
  )
`);

// 获取所有历史记录（分页）
const getHistoryList = db.prepare(`
  SELECT 
    id, start_time, end_time, duration, test_url, model_name,
    test_mode, prompt_mode, request_type, target_rpm, max_rpm,
    total_requests, success_count, failure_count, success_rate,
    avg_response_time, stop_reason, created_at
  FROM test_history
  ORDER BY created_at DESC
  LIMIT @limit OFFSET @offset
`);

// 获取历史记录总数
const getHistoryCount = db.prepare(`
  SELECT COUNT(*) as count FROM test_history
`);

// 根据ID获取单条历史记录（包含详细数据）
const getHistoryById = db.prepare(`
  SELECT * FROM test_history WHERE id = ?
`);

// 删除历史记录
const deleteHistory = db.prepare(`
  DELETE FROM test_history WHERE id = ?
`);

// 清空所有历史记录
const clearAllHistory = db.prepare(`
  DELETE FROM test_history
`);

// ==================== 定时任务相关操作 ====================

// 插入定时任务
const insertSchedule = db.prepare(`
  INSERT INTO schedules (
    name, description, test_config, schedule_type,
    run_at, cron_expression, enabled, next_run_at
  ) VALUES (
    @name, @description, @test_config, @schedule_type,
    @run_at, @cron_expression, @enabled, @next_run_at
  )
`);

// 获取所有定时任务
const getAllSchedules = db.prepare(`
  SELECT * FROM schedules ORDER BY created_at DESC
`);

// 根据 ID 获取定时任务
const getScheduleById = db.prepare(`
  SELECT * FROM schedules WHERE id = ?
`);

// 更新定时任务
const updateSchedule = db.prepare(`
  UPDATE schedules SET
    name = @name,
    description = @description,
    test_config = @test_config,
    schedule_type = @schedule_type,
    run_at = @run_at,
    cron_expression = @cron_expression,
    enabled = @enabled,
    next_run_at = @next_run_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

// 删除定时任务
const deleteSchedule = db.prepare(`
  DELETE FROM schedules WHERE id = ?
`);

// 切换定时任务启用状态
const toggleScheduleEnabled = db.prepare(`
  UPDATE schedules SET
    enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

// 更新定时任务执行时间
const updateScheduleRunTime = db.prepare(`
  UPDATE schedules SET
    last_run_at = @last_run_at,
    next_run_at = @next_run_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

// 获取所有启用的定时任务
const getEnabledSchedules = db.prepare(`
  SELECT * FROM schedules WHERE enabled = 1
`);

// 导出函数
module.exports = {
  // 保存测试历史
  saveHistory: (data) => {
    try {
      const info = insertHistory.run({
        start_time: data.startTime,
        end_time: data.endTime,
        duration: data.duration,
        test_url: data.testUrl,
        model_name: data.modelName,
        test_mode: data.testMode,
        prompt_mode: data.promptMode,
        request_type: data.requestType,
        target_rpm: data.targetRPM,
        max_rpm: data.maxRPM || null,
        total_requests: data.totalRequests,
        success_count: data.successCount,
        failure_count: data.failureCount,
        success_rate: data.successRate,
        avg_response_time: data.avgResponseTime,
        stop_reason: data.stopReason,
        minute_stats: JSON.stringify(data.minuteStats || []),
        error_summary: JSON.stringify(data.errorSummary || {})
      });
      return info.lastInsertRowid;
    } catch (error) {
      console.error('保存历史记录失败:', error);
      throw error;
    }
  },

  // 获取历史记录列表
  getHistoryList: (page = 1, pageSize = 20) => {
    try {
      const offset = (page - 1) * pageSize;
      const list = getHistoryList.all({ limit: pageSize, offset });
      const { count } = getHistoryCount.get();
      
      return {
        list: list.map(item => ({
          ...item,
          start_time: item.start_time,
          end_time: item.end_time
        })),
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      };
    } catch (error) {
      console.error('获取历史记录列表失败:', error);
      throw error;
    }
  },

  // 获取单条历史记录详情
  getHistoryDetail: (id) => {
    try {
      const record = getHistoryById.get(id);
      if (!record) {
        return null;
      }
      
      return {
        ...record,
        minuteStats: JSON.parse(record.minute_stats || '[]'),
        errorSummary: JSON.parse(record.error_summary || '{}')
      };
    } catch (error) {
      console.error('获取历史记录详情失败:', error);
      throw error;
    }
  },

  // 删除历史记录
  deleteHistory: (id) => {
    try {
      const info = deleteHistory.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      throw error;
    }
  },

  // 清空所有历史记录
  clearAllHistory: () => {
    try {
      clearAllHistory.run();
      return true;
    } catch (error) {
      console.error('清空历史记录失败:', error);
      throw error;
    }
  },

  // 关闭数据库连接
  close: () => {
    db.close();
  },

  // ==================== 定时任务相关方法 ====================

  // 创建定时任务
  createSchedule: (data) => {
    try {
      const info = insertSchedule.run({
        name: data.name,
        description: data.description || null,
        test_config: JSON.stringify(data.testConfig),
        schedule_type: data.scheduleType,
        run_at: data.runAt || null,
        cron_expression: data.cronExpression || null,
        enabled: data.enabled !== false ? 1 : 0,
        next_run_at: data.nextRunAt || null
      });
      return info.lastInsertRowid;
    } catch (error) {
      console.error('创建定时任务失败:', error);
      throw error;
    }
  },

  // 获取所有定时任务
  getAllSchedules: () => {
    try {
      const list = getAllSchedules.all();
      return list.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        testConfig: JSON.parse(item.test_config),
        scheduleType: item.schedule_type,
        runAt: item.run_at,
        cronExpression: item.cron_expression,
        enabled: item.enabled === 1,
        lastRunAt: item.last_run_at,
        nextRunAt: item.next_run_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('获取定时任务列表失败:', error);
      throw error;
    }
  },

  // 根据 ID 获取定时任务
  getScheduleById: (id) => {
    try {
      const item = getScheduleById.get(id);
      if (!item) {
        return null;
      }
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        testConfig: JSON.parse(item.test_config),
        scheduleType: item.schedule_type,
        runAt: item.run_at,
        cronExpression: item.cron_expression,
        enabled: item.enabled === 1,
        lastRunAt: item.last_run_at,
        nextRunAt: item.next_run_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };
    } catch (error) {
      console.error('获取定时任务详情失败:', error);
      throw error;
    }
  },

  // 更新定时任务
  updateSchedule: (id, data) => {
    try {
      const info = updateSchedule.run({
        id,
        name: data.name,
        description: data.description || null,
        test_config: JSON.stringify(data.testConfig),
        schedule_type: data.scheduleType,
        run_at: data.runAt || null,
        cron_expression: data.cronExpression || null,
        enabled: data.enabled !== false ? 1 : 0,
        next_run_at: data.nextRunAt || null
      });
      return info.changes > 0;
    } catch (error) {
      console.error('更新定时任务失败:', error);
      throw error;
    }
  },

  // 删除定时任务
  deleteSchedule: (id) => {
    try {
      const info = deleteSchedule.run(id);
      return info.changes > 0;
    } catch (error) {
      console.error('删除定时任务失败:', error);
      throw error;
    }
  },

  // 切换定时任务启用状态
  toggleSchedule: (id) => {
    try {
      const info = toggleScheduleEnabled.run(id);
      if (info.changes > 0) {
        // 返回更新后的任务
        return module.exports.getScheduleById(id);
      }
      return null;
    } catch (error) {
      console.error('切换定时任务状态失败:', error);
      throw error;
    }
  },

  // 更新定时任务执行时间
  updateScheduleRunTime: (id, lastRunAt, nextRunAt) => {
    try {
      const info = updateScheduleRunTime.run({
        id,
        last_run_at: lastRunAt,
        next_run_at: nextRunAt
      });
      return info.changes > 0;
    } catch (error) {
      console.error('更新定时任务执行时间失败:', error);
      throw error;
    }
  },

  // 获取所有启用的定时任务
  getEnabledSchedules: () => {
    try {
      const list = getEnabledSchedules.all();
      return list.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        testConfig: JSON.parse(item.test_config),
        scheduleType: item.schedule_type,
        runAt: item.run_at,
        cronExpression: item.cron_expression,
        enabled: item.enabled === 1,
        lastRunAt: item.last_run_at,
        nextRunAt: item.next_run_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('获取启用的定时任务失败:', error);
      throw error;
    }
  }
};

