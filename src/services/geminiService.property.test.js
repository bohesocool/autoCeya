/**
 * Gemini 服务属性测试
 * 使用 fast-check 进行属性测试
 * 
 * **Feature: fix-ai-streaming, Property 1: 流式响应完整性**
 * **验证需求: 3.3**
 */
const fc = require('fast-check');
const { EventEmitter } = require('events');
const axios = require('axios');
const { GeminiService } = require('./aiService');

// 模拟 axios
jest.mock('axios');

/**
 * 创建模拟的 Gemini 流式响应流
 * Gemini 使用 candidates[0].content.parts[0].text 格式
 * @param {Array<string>} textChunks - 要发送的文本块数组
 * @returns {EventEmitter} 模拟的流对象
 */
function createMockGeminiStream(textChunks) {
  const stream = new EventEmitter();
  
  setTimeout(() => {
    // 发送每个文本块作为 SSE 数据
    for (const chunk of textChunks) {
      const sseData = `data: {"candidates":[{"content":{"parts":[{"text":"${escapeJsonString(chunk)}"}]}}]}\n`;
      stream.emit('data', Buffer.from(sseData));
    }
    // Gemini 流结束时发送 end 事件（不使用 [DONE] 标记）
    stream.emit('end');
  }, 5);
  
  return stream;
}

/**
 * 转义 JSON 字符串中的特殊字符
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeJsonString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}


describe('Gemini 服务属性测试', () => {
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new GeminiService({
      url: 'https://generativelanguage.googleapis.com',
      modelName: 'gemini-pro',
      apiKey: 'test-api-key',
      requestType: 'stream',
      timeout: 30000,
    });
  });

  /**
   * **Feature: fix-ai-streaming, Property 1: 流式响应完整性**
   * **验证需求: 3.3**
   * 
   * 属性：对于任何流式请求，如果请求成功，则返回的 content 字段应包含完整的文本内容，
   * 而不是 Stream 对象或空字符串（除非 AI 真的返回空响应）
   */
  test('属性 1: 流式响应应返回完整拼接的文本内容', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成 1-10 个非空文本块
        fc.array(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.length > 0 && !s.includes('"') && !s.includes('\\') && !s.includes('\n')),
          { minLength: 1, maxLength: 10 }
        ),
        async (textChunks) => {
          // 创建模拟流
          const mockStream = createMockGeminiStream(textChunks);
          
          axios.post.mockResolvedValue({
            data: mockStream,
            status: 200,
          });
          
          // 执行请求
          const result = await service.sendRequest('test prompt');
          
          // 验证属性：
          // 1. 返回的 content 应该是字符串类型
          expect(typeof result.content).toBe('string');
          
          // 2. content 不应该是 Stream 对象
          expect(result.content).not.toBeInstanceOf(EventEmitter);
          
          // 3. content 应该等于所有文本块的拼接
          const expectedContent = textChunks.join('');
          expect(result.content).toBe(expectedContent);
          
          // 4. 请求应该成功
          expect(result.success).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 } // 运行 100 次迭代
    );
  });

  /**
   * **Feature: fix-ai-streaming, Property 1: 流式响应完整性（边界情况）**
   * **验证需求: 3.3**
   * 
   * 验证单个文本块的情况
   */
  test('属性 1 边界: 单个文本块应正确返回', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成单个非空文本
        fc.string({ minLength: 1, maxLength: 200 })
          .filter(s => s.length > 0 && !s.includes('"') && !s.includes('\\') && !s.includes('\n')),
        async (text) => {
          const mockStream = createMockGeminiStream([text]);
          
          axios.post.mockResolvedValue({
            data: mockStream,
            status: 200,
          });
          
          const result = await service.sendRequest('test prompt');
          
          // 验证内容完整性
          expect(typeof result.content).toBe('string');
          expect(result.content).toBe(text);
          expect(result.success).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
