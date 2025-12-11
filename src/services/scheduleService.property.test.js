/**
 * ScheduleService 属性测试
 * 使用 fast-check 进行属性测试
 * 
 * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
 * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
 */
const fc = require('fast-check');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 测试用的内存数据库路径
const testDbPath = path.join(__dirname, '../../data/test_schedule.db');

// 创建测试数据库模块
let testDb;
let scheduleService;
let cronManager;

/**
 * 初始化测试数据库
 */
function initTestDb() {
  // 确保目录存在
  const dbDir = path.dirname(testDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // 删除旧的测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  testDb = new Database(testDbPath);
  
  // 创建定时任务表
  testDb.exec(`
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

  // 准备语句
  const insertSchedule = testDb.prepare(`
    INSERT INTO schedules (
      name, description, test_config, schedule_type,
      run_at, cron_expression, enabled, next_run_at
    ) VALUES (
      @name, @description, @test_config, @schedule_type,
      @run_at, @cron_expression, @enabled, @next_run_at
    )
  `);

  const getAllSchedules = testDb.prepare(`
    SELECT * FROM schedules ORDER BY created_at DESC
  `);

  const getScheduleById = testDb.prepare(`
    SELECT * FROM schedules WHERE id = ?
  `);

  const updateSchedule = testDb.prepare(`
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

  const deleteSchedule = testDb.prepare(`
    DELETE FROM schedules WHERE id = ?
  `);

  const toggleScheduleEnabled = testDb.prepare(`
    UPDATE schedules SET
      enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const updateScheduleRunTime = testDb.prepare(`
    UPDATE schedules SET
      last_run_at = @last_run_at,
      next_run_at = @next_run_at,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  const getEnabledSchedules = testDb.prepare(`
    SELECT * FROM schedules WHERE enabled = 1
  `);

  // 返回数据库操作方法
  return {
    createSchedule: (data) => {
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
    },

    getAllSchedules: () => {
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
    },

    getScheduleById: (id) => {
      const item = getScheduleById.get(id);
      if (!item) return null;
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
    },

    updateSchedule: (id, data) => {
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
    },

    deleteSchedule: (id) => {
      const info = deleteSchedule.run(id);
      return info.changes > 0;
    },

    toggleSchedule: (id) => {
      const info = toggleScheduleEnabled.run(id);
      if (info.changes > 0) {
        const item = getScheduleById.get(id);
        if (!item) return null;
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
      }
      return null;
    },

    updateScheduleRunTime: (id, lastRunAt, nextRunAt) => {
      const info = updateScheduleRunTime.run({
        id,
        last_run_at: lastRunAt,
        next_run_at: nextRunAt
      });
      return info.changes > 0;
    },

    getEnabledSchedules: () => {
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
    },

    clearAll: () => {
      testDb.exec('DELETE FROM schedules');
    },

    close: () => {
      testDb.close();
    }
  };
}

/**
 * 生成有效的测试配置
 */
const validTestConfigArbitrary = fc.record({
  url: fc.constantFrom('https://api.example.com/v1', 'https://api.openai.com/v1', 'https://api.anthropic.com'),
  modelName: fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro'),
  apiKey: fc.constantFrom('sk-test-key-12345678901234567890', 'sk-prod-key-09876543210987654321'),
  providerType: fc.constantFrom('gemini', 'openai', 'claude'),
  mode: fc.constantFrom('fixed', 'auto'),
  rpm: fc.integer({ min: 1, max: 100 }),
  testDuration: fc.integer({ min: 1, max: 60 })
});


/**
 * 生成有效的任务名称
 */
const validNameArbitrary = fc.constantFrom(
  '测试任务1', '测试任务2', '每日测试', '性能测试',
  'API测试', '压力测试', '定时任务A', '定时任务B'
);

/**
 * 生成有效的 cron 表达式
 */
const validCronArbitrary = fc.constantFrom(
  '* * * * *',      // 每分钟
  '0 * * * *',      // 每小时
  '0 0 * * *',      // 每天
  '0 0 * * 0',      // 每周日
  '0 0 1 * *',      // 每月1号
  '*/5 * * * *',    // 每5分钟
  '0 */2 * * *',    // 每2小时
  '30 8 * * 1-5'    // 工作日8:30
);

/**
 * 生成未来的时间
 */
const futureTimeArbitrary = fc.integer({ min: 1, max: 365 * 24 * 60 }).map(minutes => {
  const future = new Date();
  future.setMinutes(future.getMinutes() + minutes);
  return future.toISOString();
});

/**
 * 生成有效的重复任务配置
 */
const validRecurringScheduleArbitrary = fc.record({
  name: validNameArbitrary,
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  testConfig: validTestConfigArbitrary,
  scheduleType: fc.constant('recurring'),
  cronExpression: validCronArbitrary,
  enabled: fc.boolean()
});

/**
 * 生成有效的一次性任务配置
 */
const validOnceScheduleArbitrary = fc.record({
  name: validNameArbitrary,
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  testConfig: validTestConfigArbitrary,
  scheduleType: fc.constant('once'),
  runAt: futureTimeArbitrary,
  enabled: fc.boolean()
});

/**
 * 生成任意有效的任务配置
 */
const validScheduleArbitrary = fc.oneof(
  validRecurringScheduleArbitrary,
  validOnceScheduleArbitrary
);

describe('ScheduleService 属性测试', () => {
  let dbOps;

  beforeAll(() => {
    dbOps = initTestDb();
    cronManager = require('../utils/cronManager');
  });

  afterAll(() => {
    if (dbOps) {
      dbOps.close();
    }
    // 清理测试数据库文件
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    // 每个测试前清空数据
    dbOps.clearAll();
  });


  /**
   * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
   * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
   * 
   * 属性：创建任务后应该能够通过 ID 查询到该任务
   */
  test('属性 1: 创建任务后应能通过 ID 查询到该任务', () => {
    fc.assert(
      fc.property(
        validScheduleArbitrary,
        (config) => {
          // 计算下次执行时间
          let nextRunAt = null;
          if (config.scheduleType === 'once') {
            nextRunAt = config.runAt;
          } else if (config.scheduleType === 'recurring') {
            const nextTime = cronManager.getNextRunTime(config.cronExpression);
            nextRunAt = nextTime ? nextTime.toISOString() : null;
          }

          // 创建任务
          const scheduleData = {
            name: config.name.trim(),
            description: config.description || null,
            testConfig: config.testConfig,
            scheduleType: config.scheduleType,
            runAt: config.runAt || null,
            cronExpression: config.cronExpression || null,
            enabled: config.enabled !== false,
            nextRunAt
          };

          const id = dbOps.createSchedule(scheduleData);
          
          // 查询任务
          const retrieved = dbOps.getScheduleById(id);
          
          // 验证任务存在
          expect(retrieved).not.toBeNull();
          expect(retrieved.id).toBe(id);
          expect(retrieved.name).toBe(config.name.trim());
          expect(retrieved.scheduleType).toBe(config.scheduleType);
          
          // 清理
          dbOps.deleteSchedule(id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
   * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
   * 
   * 属性：更新任务后配置应该反映新值
   */
  test('属性 1: 更新任务后配置应反映新值', () => {
    fc.assert(
      fc.property(
        validScheduleArbitrary,
        validNameArbitrary,
        (config, newName) => {
          // 计算下次执行时间
          let nextRunAt = null;
          if (config.scheduleType === 'once') {
            nextRunAt = config.runAt;
          } else if (config.scheduleType === 'recurring') {
            const nextTime = cronManager.getNextRunTime(config.cronExpression);
            nextRunAt = nextTime ? nextTime.toISOString() : null;
          }

          // 创建任务
          const scheduleData = {
            name: config.name.trim(),
            description: config.description || null,
            testConfig: config.testConfig,
            scheduleType: config.scheduleType,
            runAt: config.runAt || null,
            cronExpression: config.cronExpression || null,
            enabled: config.enabled !== false,
            nextRunAt
          };

          const id = dbOps.createSchedule(scheduleData);
          
          // 更新任务名称
          const updateData = {
            ...scheduleData,
            name: newName.trim()
          };
          dbOps.updateSchedule(id, updateData);
          
          // 查询更新后的任务
          const updated = dbOps.getScheduleById(id);
          
          // 验证名称已更新
          expect(updated).not.toBeNull();
          expect(updated.name).toBe(newName.trim());
          
          // 清理
          dbOps.deleteSchedule(id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
   * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
   * 
   * 属性：删除任务后应该无法查询到该任务
   */
  test('属性 1: 删除任务后应无法查询到该任务', () => {
    fc.assert(
      fc.property(
        validScheduleArbitrary,
        (config) => {
          // 计算下次执行时间
          let nextRunAt = null;
          if (config.scheduleType === 'once') {
            nextRunAt = config.runAt;
          } else if (config.scheduleType === 'recurring') {
            const nextTime = cronManager.getNextRunTime(config.cronExpression);
            nextRunAt = nextTime ? nextTime.toISOString() : null;
          }

          // 创建任务
          const scheduleData = {
            name: config.name.trim(),
            description: config.description || null,
            testConfig: config.testConfig,
            scheduleType: config.scheduleType,
            runAt: config.runAt || null,
            cronExpression: config.cronExpression || null,
            enabled: config.enabled !== false,
            nextRunAt
          };

          const id = dbOps.createSchedule(scheduleData);
          
          // 确认任务存在
          const beforeDelete = dbOps.getScheduleById(id);
          expect(beforeDelete).not.toBeNull();
          
          // 删除任务
          const deleted = dbOps.deleteSchedule(id);
          expect(deleted).toBe(true);
          
          // 验证任务已删除
          const afterDelete = dbOps.getScheduleById(id);
          expect(afterDelete).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
   * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
   * 
   * 属性：切换任务状态应该正确反转 enabled 值
   */
  test('属性 1: 切换任务状态应正确反转 enabled 值', () => {
    fc.assert(
      fc.property(
        validScheduleArbitrary,
        (config) => {
          // 计算下次执行时间
          let nextRunAt = null;
          if (config.scheduleType === 'once') {
            nextRunAt = config.runAt;
          } else if (config.scheduleType === 'recurring') {
            const nextTime = cronManager.getNextRunTime(config.cronExpression);
            nextRunAt = nextTime ? nextTime.toISOString() : null;
          }

          // 创建任务
          const scheduleData = {
            name: config.name.trim(),
            description: config.description || null,
            testConfig: config.testConfig,
            scheduleType: config.scheduleType,
            runAt: config.runAt || null,
            cronExpression: config.cronExpression || null,
            enabled: config.enabled !== false,
            nextRunAt
          };

          const id = dbOps.createSchedule(scheduleData);
          
          // 获取初始状态
          const initial = dbOps.getScheduleById(id);
          const initialEnabled = initial.enabled;
          
          // 切换状态
          const toggled = dbOps.toggleSchedule(id);
          
          // 验证状态已反转
          expect(toggled).not.toBeNull();
          expect(toggled.enabled).toBe(!initialEnabled);
          
          // 再次切换
          const toggledAgain = dbOps.toggleSchedule(id);
          expect(toggledAgain.enabled).toBe(initialEnabled);
          
          // 清理
          dbOps.deleteSchedule(id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
   * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
   * 
   * 属性：getAll 应返回所有创建的任务
   */
  test('属性 1: getAll 应返回所有创建的任务', () => {
    fc.assert(
      fc.property(
        fc.array(validScheduleArbitrary, { minLength: 1, maxLength: 10 }),
        (configs) => {
          const createdIds = [];
          
          // 创建多个任务
          for (const config of configs) {
            let nextRunAt = null;
            if (config.scheduleType === 'once') {
              nextRunAt = config.runAt;
            } else if (config.scheduleType === 'recurring') {
              const nextTime = cronManager.getNextRunTime(config.cronExpression);
              nextRunAt = nextTime ? nextTime.toISOString() : null;
            }

            const scheduleData = {
              name: config.name.trim(),
              description: config.description || null,
              testConfig: config.testConfig,
              scheduleType: config.scheduleType,
              runAt: config.runAt || null,
              cronExpression: config.cronExpression || null,
              enabled: config.enabled !== false,
              nextRunAt
            };

            const id = dbOps.createSchedule(scheduleData);
            createdIds.push(id);
          }
          
          // 获取所有任务
          const allSchedules = dbOps.getAllSchedules();
          
          // 验证数量匹配
          expect(allSchedules.length).toBe(configs.length);
          
          // 验证所有创建的 ID 都在结果中
          const retrievedIds = allSchedules.map(s => s.id);
          for (const id of createdIds) {
            expect(retrievedIds).toContain(id);
          }
          
          // 清理
          for (const id of createdIds) {
            dbOps.deleteSchedule(id);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: advanced-features, Property 1: 定时任务 CRUD 操作正确性**
   * **验证: 需求 1.1, 1.2, 2.3, 2.4, 2.5**
   * 
   * 属性：testConfig 应该正确序列化和反序列化
   */
  test('属性 1: testConfig 应正确序列化和反序列化', () => {
    fc.assert(
      fc.property(
        validScheduleArbitrary,
        (config) => {
          // 计算下次执行时间
          let nextRunAt = null;
          if (config.scheduleType === 'once') {
            nextRunAt = config.runAt;
          } else if (config.scheduleType === 'recurring') {
            const nextTime = cronManager.getNextRunTime(config.cronExpression);
            nextRunAt = nextTime ? nextTime.toISOString() : null;
          }

          // 创建任务
          const scheduleData = {
            name: config.name.trim(),
            description: config.description || null,
            testConfig: config.testConfig,
            scheduleType: config.scheduleType,
            runAt: config.runAt || null,
            cronExpression: config.cronExpression || null,
            enabled: config.enabled !== false,
            nextRunAt
          };

          const id = dbOps.createSchedule(scheduleData);
          
          // 查询任务
          const retrieved = dbOps.getScheduleById(id);
          
          // 验证 testConfig 正确反序列化
          expect(retrieved.testConfig).toEqual(config.testConfig);
          expect(retrieved.testConfig.url).toBe(config.testConfig.url);
          expect(retrieved.testConfig.modelName).toBe(config.testConfig.modelName);
          expect(retrieved.testConfig.providerType).toBe(config.testConfig.providerType);
          
          // 清理
          dbOps.deleteSchedule(id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
