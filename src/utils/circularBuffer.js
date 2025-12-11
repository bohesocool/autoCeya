/**
 * 循环缓冲区类
 * 固定大小的数据结构，当缓冲区满时，新数据会覆盖最旧的数据
 * @template T 元素类型
 */
class CircularBuffer {
  /**
   * 创建循环缓冲区
   * @param {number} capacity - 缓冲区容量，必须大于 0
   * @throws {Error} 如果容量小于 1
   */
  constructor(capacity) {
    if (capacity < 1) {
      throw new Error('缓冲区容量必须大于 0');
    }
    this._capacity = capacity;
    this._buffer = new Array(capacity);
    this._head = 0;      // 下一个写入位置
    this._count = 0;     // 当前元素数量
  }

  /**
   * 添加元素到缓冲区
   * @param {T} item - 要添加的元素
   */
  push(item) {
    this._buffer[this._head] = item;
    this._head = (this._head + 1) % this._capacity;
    if (this._count < this._capacity) {
      this._count++;
    }
  }

  /**
   * 获取所有有效元素（按时间顺序，最旧的在前）
   * @returns {T[]} 元素数组
   */
  getAll() {
    if (this._count === 0) {
      return [];
    }
    
    const result = [];
    // 计算最旧元素的起始位置
    const start = this._count < this._capacity 
      ? 0 
      : this._head;
    
    for (let i = 0; i < this._count; i++) {
      const index = (start + i) % this._capacity;
      result.push(this._buffer[index]);
    }
    
    return result;
  }

  /**
   * 获取当前元素数量
   * @returns {number} 元素数量
   */
  get count() {
    return this._count;
  }

  /**
   * 获取缓冲区容量
   * @returns {number} 容量
   */
  get capacity() {
    return this._capacity;
  }

  /**
   * 检查缓冲区是否已满
   * @returns {boolean} 是否已满
   */
  isFull() {
    return this._count === this._capacity;
  }

  /**
   * 获取数值元素的平均值
   * @returns {number} 平均值，空缓冲区返回 0
   */
  getAverage() {
    if (this._count === 0) {
      return 0;
    }
    return this.getSum() / this._count;
  }

  /**
   * 获取数值元素的总和
   * @returns {number} 总和
   */
  getSum() {
    if (this._count === 0) {
      return 0;
    }
    
    let sum = 0;
    const start = this._count < this._capacity ? 0 : this._head;
    
    for (let i = 0; i < this._count; i++) {
      const index = (start + i) % this._capacity;
      sum += this._buffer[index];
    }
    
    return sum;
  }

  /**
   * 清空缓冲区
   */
  clear() {
    this._buffer = new Array(this._capacity);
    this._head = 0;
    this._count = 0;
  }
}

module.exports = CircularBuffer;
