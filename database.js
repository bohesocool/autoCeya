const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保数据库目录存在
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建或打开数据库
const dbPath = path.join(dbDir, 'autoceya.db');
const db = new Database(dbPath);

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
  }
};

