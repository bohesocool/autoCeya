# 实现计划

- [x] 1. 创建 CircularBuffer 工具类









  - [x] 1.1 实现 CircularBuffer 类基础结构

    - 创建 `src/utils/circularBuffer.js` 文件
    - 实现构造函数，接受 capacity 参数
    - 实现 push 方法，添加元素到缓冲区
    - 实现 getAll 方法，返回所有有效元素（按时间顺序）
    - 实现 count 和 capacity 属性
    - 实现 isFull 方法
    - _需求: 5.1, 5.2, 5.3, 5.6_


  - [x] 1.2 实现 CircularBuffer 统计方法

    - 实现 getAverage 方法，计算数值元素平均值
    - 实现 getSum 方法，计算数值元素总和
    - 实现 clear 方法，清空缓冲区
    - _需求: 1.3, 5.4, 5.5_

  - [x] 1.3 编写属性测试：缓冲区大小限制



    - **Property 1: 缓冲区大小限制**
    - **验证: 需求 1.1, 4.1, 4.2, 5.1**

  - [x] 1.4 编写属性测试：最旧数据被覆盖



    - **Property 2: 最旧数据被覆盖**
    - **验证: 需求 1.2, 4.3**

  - [x] 1.5 编写属性测试：平均值计算正确性



    - **Property 3: 平均值计算正确性**
    - **验证: 需求 1.3, 5.4**


  - [x] 1.6 编写属性测试：元素顺序保持

    - **Property 4: 元素顺序保持**
    - **验证: 需求 5.3**


  - [x] 1.7 编写属性测试：清空操作正确性

    - **Property 5: 清空操作正确性**
    - **验证: 需求 5.5**

- [x] 2. 创建 SlidingWindowStats 工具类





  - [x] 2.1 实现 SlidingWindowStats 类


    - 创建 `src/utils/slidingWindowStats.js` 文件
    - 实现构造函数，接受 windowSize 参数
    - 实现 add 方法，添加新值并更新统计
    - 实现 getAverage 方法，返回平均值
    - 实现 getSum 方法，返回总和
    - 实现 count 属性和 reset 方法
    - _需求: 2.1, 2.2_

  - [x] 2.2 编写属性测试：滑动窗口平均值一致性






    - **Property 6: 滑动窗口平均值一致性**
    - **验证: 需求 2.1**

- [x] 3. 创建 MemoryMonitor 工具类
  - [x] 3.1 实现 MemoryMonitor 类
    - 创建 `src/utils/memoryMonitor.js` 文件
    - 实现构造函数，接受配置选项
    - 实现 start 方法，启动定期监控
    - 实现 stop 方法，停止监控
    - 实现 getMemoryUsage 方法，返回内存统计
    - 实现 check 方法，手动触发检查
    - _需求: 3.1, 3.2, 3.3_

  - [x] 3.2 编写单元测试：MemoryMonitor

    - 测试启动和停止监控
    - 测试获取内存使用情况
    - _需求: 3.1, 3.2, 3.3_

- [x] 4. 检查点 - 确保所有测试通过





  - 确保所有测试通过，如有问题请询问用户

- [x] 5. 重构 StressTestService 使用新的缓冲区



  - [x] 5.1 替换 responseTimes 数组为 CircularBuffer


    - 修改 `src/services/stressTestService.js`
    - 创建 responseTimes 循环缓冲区（容量 1000）
    - 更新 executeRequest 方法使用 push
    - 更新 updateStats 方法使用 getAverage
    - _需求: 1.1, 1.2, 1.3_


  - [x] 5.2 替换 errorLogs 数组为 CircularBuffer

    - 创建 errorLogs 循环缓冲区（容量 100）
    - 更新错误日志记录逻辑
    - _需求: 4.1_


  - [x] 5.3 替换 requestLogs 数组为 CircularBuffer

    - 创建 requestLogs 循环缓冲区（容量 500）
    - 更新请求日志记录逻辑
    - _需求: 4.2_



  - [x] 5.4 集成 MemoryMonitor

    - 在服务启动时创建 MemoryMonitor 实例
    - 配置警告阈值 500MB，临界阈值 800MB
    - 在服务停止时停止监控
    - _需求: 3.1, 3.2, 3.3_

- [x] 6. 更新 /metrics 端点






  - [x] 6.1 添加内存统计到 /metrics 响应

    - 修改 `server-new.js` 中的 /metrics 端点
    - 添加 heapUsed、heapTotal、rss 等字段
    - _需求: 3.4_

- [x] 7. 最终检查点 - 确保所有测试通过





  - 确保所有测试通过，如有问题请询问用户
