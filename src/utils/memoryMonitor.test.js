/**
 * MemoryMonitor 单元测试
 * 测试内存监控类的核心功能
 */
const MemoryMonitor = require('./memoryMonitor');

describe('MemoryMonitor', () => {
  let monitor;

  afterEach(() => {
    // 确保每个测试后停止监控
    if (monitor && monitor.isRunning()) {
      monitor.stop();
    }
  });

  describe('构造函数', () => {
    test('应使用默认配置创建实例', () => {
      monitor = new MemoryMonitor();
      
      const MB = 1024 * 1024;
      expect(monitor.warningThreshold).toBe(500 * MB);
      expect(monitor.criticalThreshold).toBe(800 * MB);
      expect(monitor.checkInterval).toBe(30000);
    });

    test('应使用自定义配置创建实例', () => {
      const MB = 1024 * 1024;
      monitor = new MemoryMonitor({
        warningThreshold: 300 * MB,
        criticalThreshold: 600 * MB,
        checkInterval: 10000
      });
      
      expect(monitor.warningThreshold).toBe(300 * MB);
      expect(monitor.criticalThreshold).toBe(600 * MB);
      expect(monitor.checkInterval).toBe(10000);
    });
  });

  describe('start 和 stop 方法', () => {
    test('start 应启动监控', () => {
      monitor = new MemoryMonitor({ checkInterval: 60000 });
      
      expect(monitor.isRunning()).toBe(false);
      monitor.start();
      expect(monitor.isRunning()).toBe(true);
    });

    test('stop 应停止监控', () => {
      monitor = new MemoryMonitor({ checkInterval: 60000 });
      
      monitor.start();
      expect(monitor.isRunning()).toBe(true);
      
      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    test('重复调用 start 不应创建多个定时器', () => {
      monitor = new MemoryMonitor({ checkInterval: 60000 });
      
      monitor.start();
      monitor.start();
      monitor.start();
      
      expect(monitor.isRunning()).toBe(true);
      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    test('重复调用 stop 不应报错', () => {
      monitor = new MemoryMonitor({ checkInterval: 60000 });
      
      monitor.start();
      monitor.stop();
      monitor.stop();
      monitor.stop();
      
      expect(monitor.isRunning()).toBe(false);
    });
  });

  describe('getMemoryUsage 方法', () => {
    test('应返回内存使用统计', () => {
      monitor = new MemoryMonitor();
      
      const usage = monitor.getMemoryUsage();
      
      expect(usage).not.toBeNull();
      expect(typeof usage.heapUsed).toBe('number');
      expect(typeof usage.heapTotal).toBe('number');
      expect(typeof usage.external).toBe('number');
      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.heapUsedMB).toBe('number');
      expect(typeof usage.heapTotalMB).toBe('number');
      expect(typeof usage.rssMB).toBe('number');
      expect(typeof usage.externalMB).toBe('number');
      expect(typeof usage.timestamp).toBe('string');
    });

    test('内存值应为正数', () => {
      monitor = new MemoryMonitor();
      
      const usage = monitor.getMemoryUsage();
      
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.rss).toBeGreaterThan(0);
    });

    test('MB 值应与字节值一致', () => {
      monitor = new MemoryMonitor();
      
      const usage = monitor.getMemoryUsage();
      const MB = 1024 * 1024;
      
      // 允许小数点精度误差
      expect(usage.heapUsedMB).toBeCloseTo(usage.heapUsed / MB, 1);
      expect(usage.heapTotalMB).toBeCloseTo(usage.heapTotal / MB, 1);
    });
  });

  describe('check 方法', () => {
    test('正常内存使用应返回 normal 状态', () => {
      // 使用非常高的阈值确保不会触发警告
      const MB = 1024 * 1024;
      monitor = new MemoryMonitor({
        warningThreshold: 10000 * MB,
        criticalThreshold: 20000 * MB
      });
      
      const result = monitor.check();
      
      expect(result.status).toBe('normal');
      expect(result.memory).not.toBeNull();
    });

    test('超过警告阈值应返回 warning 状态', () => {
      // 使用非常低的阈值确保触发警告
      monitor = new MemoryMonitor({
        warningThreshold: 1,
        criticalThreshold: 1024 * 1024 * 10000
      });
      
      const result = monitor.check();
      
      expect(result.status).toBe('warning');
    });

    test('超过临界阈值应返回 critical 状态', () => {
      // 使用非常低的阈值确保触发临界
      monitor = new MemoryMonitor({
        warningThreshold: 1,
        criticalThreshold: 1
      });
      
      const result = monitor.check();
      
      expect(result.status).toBe('critical');
    });

    test('应触发警告回调', () => {
      const onWarning = jest.fn();
      monitor = new MemoryMonitor({
        warningThreshold: 1,
        criticalThreshold: 1024 * 1024 * 10000,
        onWarning
      });
      
      monitor.check();
      
      expect(onWarning).toHaveBeenCalled();
    });

    test('应触发临界回调', () => {
      const onCritical = jest.fn();
      monitor = new MemoryMonitor({
        warningThreshold: 1,
        criticalThreshold: 1,
        onCritical
      });
      
      monitor.check();
      
      expect(onCritical).toHaveBeenCalled();
    });
  });
});
