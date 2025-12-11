/**
 * OpenAI 服务单元测试
 * 测试 OpenAI 服务的流式和非流式请求处理
 * 验证需求: 1.1, 1.2, 1.3, 1.4, 1.5
 */
const { EventEmitter } = require('events');
const axios = require('axios');
const { OpenAIService } = require('./aiService');

// 模拟 axios
jest.mock('axios');

/**
 * 创建模拟的流对象
 * @param {Array<string>} chunks - 要发送的数据块数组
 * @param {boolean} shouldError - 是否触发错误
 * @returns {EventEmitter} 模拟的流对象
 */
function createMockStream(chunks, shouldError = false) {
  const stream = new EventEmitter();
  
  setTimeout(() => {
    for (const chunk of chunks) {
      stream.emit('data', Buffer.from(chunk));
    }
    
    if (shouldError) {
      stream.emit('error', new Error('模拟流错误'));
    } else {
      stream.emit('end');
    }
  }, 10);
  
  return stream;
}

describe('OpenAIService', () => {
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('非流式请求', () => {
    beforeEach(() => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 30000,
      });
    });

    test('应正确解析 JSON 响应并提取文本内容 (需求 1.1)', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Hello, this is a test response.',
              },
            },
          ],
        },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello, this is a test response.');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse.data);
    });

    test('应使用正确的请求参数调用 API (需求 1.1)', async () => {
      const mockResponse = {
        data: { choices: [{ message: { content: 'test' } }] },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      await service.sendRequest('Test prompt');
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test prompt' }],
          stream: false,
        },
        expect.objectContaining({
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    test('应处理空响应内容 (需求 1.1)', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: {} }],
        },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });

    test('应处理响应结构不完整的情况 (需求 1.1)', async () => {
      const mockResponse = {
        data: { choices: [] },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });
  });

  describe('流式请求', () => {
    beforeEach(() => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'stream',
        timeout: 30000,
      });
    });

    test('应正确解析 SSE 事件流并累积所有文本块 (需求 1.2, 1.3)', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" World"}}]}\n',
        'data: {"choices":[{"delta":{"content":"!"}}]}\n',
        'data: [DONE]\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello World!');
      expect(result.status).toBe(200);
    });

    test('应使用正确的流式请求参数调用 API (需求 1.2)', async () => {
      const chunks = ['data: {"choices":[{"delta":{"content":"test"}}]}\n', 'data: [DONE]\n'];
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      await service.sendRequest('Test prompt');
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test prompt' }],
          stream: true,
        },
        expect.objectContaining({
          timeout: 30000,
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    test('应正确拼接所有 delta.content 字段 (需求 1.3)', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n',
        'data: {"choices":[{"delta":{"content":"First "}}]}\n',
        'data: {"choices":[{"delta":{"content":"Second "}}]}\n',
        'data: {"choices":[{"delta":{"content":"Third"}}]}\n',
        'data: {"choices":[{"delta":{}}]}\n',
        'data: [DONE]\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.content).toBe('First Second Third');
    });

    test('应在收到 [DONE] 时返回完整响应 (需求 1.4)', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Complete"}}]}\n',
        'data: [DONE]\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Complete');
    });

    test('应记录首字节时间 (TTFB) (需求 1.4)', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"test"}}]}\n',
        'data: [DONE]\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.ttfb).toBeDefined();
      expect(typeof result.ttfb).toBe('number');
      expect(result.ttfb).toBeGreaterThanOrEqual(0);
    });

    test('应处理流自然结束（无 [DONE] 标记）', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"No DONE marker"}}]}\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('No DONE marker');
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 30000,
      });
    });

    test('应在请求失败时抛出错误 (需求 1.5)', async () => {
      const error = new Error('Network error');
      error.response = {
        status: 500,
        data: { error: { message: 'Internal server error' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow('Network error');
    });

    test('应处理 401 认证错误 (需求 1.5)', async () => {
      const error = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: { error: { message: 'Invalid API key' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理 429 速率限制错误 (需求 1.5)', async () => {
      const error = new Error('Rate limited');
      error.response = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理 500 服务器错误 (需求 1.5)', async () => {
      const error = new Error('Server error');
      error.response = {
        status: 500,
        data: { error: { message: 'Internal server error' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });
  });

  describe('超时处理', () => {
    test('应使用配置的超时时间', async () => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 5000,
      });
      
      const mockResponse = {
        data: { choices: [{ message: { content: 'test' } }] },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      await service.sendRequest('Hello');
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    test('应使用默认超时时间（150000ms）当未配置时', async () => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
      });
      
      const mockResponse = {
        data: { choices: [{ message: { content: 'test' } }] },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      await service.sendRequest('Hello');
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 150000,
        })
      );
    });

    test('应处理超时错误', async () => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 1000,
      });
      
      const error = new Error('timeout of 1000ms exceeded');
      error.code = 'ECONNABORTED';
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });
  });

  describe('流式请求错误处理', () => {
    beforeEach(() => {
      service = new OpenAIService({
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-api-key',
        requestType: 'stream',
        timeout: 30000,
      });
    });

    test('应处理流中断错误 (需求 1.5)', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Partial"}}]}\n',
      ];
      
      const mockStream = createMockStream(chunks, true);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      await expect(service.sendRequest('Hello')).rejects.toThrow('模拟流错误');
    });

    test('应处理连接建立失败', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow('Connection refused');
    });
  });
});
