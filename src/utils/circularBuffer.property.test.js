const fc = require('fast-check');
const CircularBuffer = require('./circularBuffer');

describe('CircularBuffer 属性测试', () => {
  /**
   * **Feature: performance-optimization, Property 1: 缓冲区大小限制**
   * *对于任意* 循环缓冲区和任意数量的元素，当添加的元素数量超过容量时，
   * 缓冲区的实际元素数量应该等于容量。
   * **验证: 需求 1.1, 4.1, 4.2, 5.1**
   */
  test('Property 1: 缓冲区大小限制 - 元素数量永远不超过容量', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // 容量
        fc.array(fc.integer()),             // 要添加的元素
        (capacity, elements) => {
          const buffer = new CircularBuffer(capacity);
          
          // 添加所有元素
          for (const elem of elements) {
            buffer.push(elem);
          }
          
          // 验证：元素数量永远不超过容量
          expect(buffer.count).toBeLessThanOrEqual(capacity);
          
          // 验证：当添加元素数量超过容量时，count 等于 capacity
          if (elements.length >= capacity) {
            expect(buffer.count).toBe(capacity);
          } else {
            expect(buffer.count).toBe(elements.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


  /**
   * **Feature: performance-optimization, Property 2: 最旧数据被覆盖**
   * *对于任意* 已满的循环缓冲区，当添加新元素时，最旧的元素应该被移除，
   * 且缓冲区大小保持不变。
   * **验证: 需求 1.2, 4.3**
   */
  test('Property 2: 最旧数据被覆盖 - 新元素覆盖最旧元素', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),   // 容量
        fc.array(fc.integer(), { minLength: 1 }), // 初始元素（至少1个）
        fc.integer(),                       // 新元素
        (capacity, initialElements, newElement) => {
          const buffer = new CircularBuffer(capacity);
          
          // 先填满缓冲区
          for (const elem of initialElements) {
            buffer.push(elem);
          }
          
          // 如果缓冲区已满，记录最旧元素
          const wasFull = buffer.isFull();
          const oldestBefore = wasFull ? buffer.getAll()[0] : null;
          const countBefore = buffer.count;
          
          // 添加新元素
          buffer.push(newElement);
          
          const allElements = buffer.getAll();
          
          if (wasFull) {
            // 验证：缓冲区大小保持不变
            expect(buffer.count).toBe(countBefore);
            // 验证：最旧元素被移除（如果新元素不等于旧元素）
            if (newElement !== oldestBefore) {
              expect(allElements[0]).not.toBe(oldestBefore);
            }
            // 验证：新元素在最后
            expect(allElements[allElements.length - 1]).toBe(newElement);
          }
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: performance-optimization, Property 3: 平均值计算正确性**
   * *对于任意* 包含数值元素的循环缓冲区，getAverage() 返回的值应该等于
   * 所有元素之和除以元素数量。
   * **验证: 需求 1.3, 5.4**
   */
  test('Property 3: 平均值计算正确性 - 平均值等于总和除以数量', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // 容量
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1 }), // 数值元素
        (capacity, elements) => {
          const buffer = new CircularBuffer(capacity);
          
          for (const elem of elements) {
            buffer.push(elem);
          }
          
          const allElements = buffer.getAll();
          const expectedSum = allElements.reduce((a, b) => a + b, 0);
          const expectedAverage = expectedSum / allElements.length;
          
          // 验证：平均值计算正确（考虑浮点数精度）
          expect(buffer.getAverage()).toBeCloseTo(expectedAverage, 10);
          // 验证：总和计算正确
          expect(buffer.getSum()).toBe(expectedSum);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: performance-optimization, Property 4: 元素顺序保持**
   * *对于任意* 循环缓冲区和按顺序添加的元素序列，getAll() 返回的数组
   * 应该保持元素的添加顺序（最旧的在前）。
   * **验证: 需求 5.3**
   */
  test('Property 4: 元素顺序保持 - getAll 返回按添加顺序排列的元素', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),   // 容量
        fc.array(fc.integer()),             // 元素序列
        (capacity, elements) => {
          const buffer = new CircularBuffer(capacity);
          
          for (const elem of elements) {
            buffer.push(elem);
          }
          
          const allElements = buffer.getAll();
          
          // 预期结果：最后 capacity 个元素（或全部元素如果不足）
          const expectedElements = elements.slice(-capacity);
          
          // 验证：元素顺序正确
          expect(allElements).toEqual(expectedElements);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: performance-optimization, Property 5: 清空操作正确性**
   * *对于任意* 非空循环缓冲区，调用 clear() 后，count 应该为 0，
   * getAll() 应该返回空数组。
   * **验证: 需求 5.5**
   */
  test('Property 5: 清空操作正确性 - clear 后缓冲区为空', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // 容量
        fc.array(fc.integer(), { minLength: 1 }), // 至少有一个元素
        (capacity, elements) => {
          const buffer = new CircularBuffer(capacity);
          
          // 添加元素
          for (const elem of elements) {
            buffer.push(elem);
          }
          
          // 确保缓冲区非空
          expect(buffer.count).toBeGreaterThan(0);
          
          // 清空缓冲区
          buffer.clear();
          
          // 验证：count 为 0
          expect(buffer.count).toBe(0);
          // 验证：getAll 返回空数组
          expect(buffer.getAll()).toEqual([]);
          // 验证：isFull 返回 false
          expect(buffer.isFull()).toBe(false);
          // 验证：getAverage 返回 0
          expect(buffer.getAverage()).toBe(0);
          // 验证：getSum 返回 0
          expect(buffer.getSum()).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
