/**
 * 滑动窗口统计类
 * 使用 O(1) 时间复杂度更新统计数据
 * 通过维护运行总和来实现高效的平均值计算
 */
class SlidingWindowStats {
  /**
   * 创建滑动窗口统计
   * @param {number} windowSize - 窗口大小，必须大于 0
   * @throws {Error} 如果窗口大小小于 1
   */
  constructor(windowSize) {
    if (windowSize < 1) {
      throw new Error('窗口大小必须大于 0');
    }
    this._windowSize = windowSize;
    this._buffer = new Array(windowSize);
    this._head = 0;      // 下一个写入位置
    this._count = 0;     // 当前样本数量
    this._sum = 0;       // 运行总和
  }

  /**
   * 添加新值
   * 使用 O(1) 时间复杂度更新统计数据
   * @param {number} value - 要添加的值
   */
  add(value) {
    // 如果窗口已满，需要减去将被覆盖的旧值
    if (this._count === this._windowSize) {
      this._sum -= this._buffer[this._head];
    }
    
    // 添加新值
    this._buffer[this._head] = value;
    this._sum += value;
    
    // 更新位置指针
    this._head = (this._head + 1) % this._windowSize;
    
    // 更新计数（如果窗口未满）
    if (this._count < this._windowSize) {
      this._count++;
    }
  }

  /**
   * 获取平均值
   * @returns {number} 平均值，空窗口返回 0
   */
  getAverage() {
    if (this._count === 0) {
      return 0;
    }
    return this._sum / this._count;
  }

  /**
   * 获取总和
   * @returns {number} 总和
   */
  getSum() {
    return this._sum;
  }

  /**
   * 获取当前样本数量
   * @returns {number} 样本数量
   */
  get count() {
    return this._count;
  }

  /**
   * 获取窗口大小
   * @returns {number} 窗口大小
   */
  get windowSize() {
    return this._windowSize;
  }

  /**
   * 重置统计数据
   */
  reset() {
    this._buffer = new Array(this._windowSize);
    this._head = 0;
    this._count = 0;
    this._sum = 0;
  }
}

module.exports = SlidingWindowStats;
