/**
 * Gemini 服务单元测试
 * 测试 Gemini 服务的流式和非流式请求处理
 * 验证需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */
const { EventEmitter } = require('events');
const axios = require('axios');
const { GeminiService } = require('./aiService');

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

describe('GeminiService', () => {
  let service;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('非流式请求', () => {
    beforeEach(() => {
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 30000,
      });
    });

    test('应正确解析 JSON 响应并提取 candidates 中的文本 (需求 3.1)', async () => {
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Hello, this is a test response from Gemini.' },
                ],
              },
            },
          ],
        },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello, this is a test response from Gemini.');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse.data);
    });

    test('应使用正确的请求参数调用 API (需求 3.1)', async () => {
      const mockResponse = {
        data: { candidates: [{ content: { parts: [{ text: 'test' }] } }] },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      await service.sendRequest('Test prompt');
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=test-api-key',
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Test prompt' }],
            },
          ],
        },
        expect.objectContaining({
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    test('应处理空响应内容 (需求 3.1)', async () => {
      const mockResponse = {
        data: {
          candidates: [{ content: { parts: [{}] } }],
        },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });

    test('应处理响应结构不完整的情况 (需求 3.1)', async () => {
      const mockResponse = {
        data: { candidates: [] },
        status: 200,
      };
      
      axios.post.mockResolvedValue(mockResponse);
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });

    test('应处理 candidates 为空数组的情况 (需求 3.1)', async () => {
      const mockResponse = {
        data: { candidates: [{ content: { parts: [] } }] },
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
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-api-key',
        requestType: 'stream',
        timeout: 30000,
      });
    });

    test('应正确解析 SSE 事件流并累积所有文本块 (需求 3.2, 3.3)', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" World"}]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"!"}]}}]}\n',
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

    test('应使用正确的流式请求参数调用 API (需求 3.2)', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"test"}]}}]}\n',
        'data: [DONE]\n',
      ];
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      await service.sendRequest('Test prompt');
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=test-api-key&alt=sse',
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Test prompt' }],
            },
          ],
        },
        expect.objectContaining({
          timeout: 30000,
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    test('应正确拼接所有 parts[0].text 字段 (需求 3.3)', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"First "}]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"Second "}]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"Third"}]}}]}\n',
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

    test('应在流结束时返回完整响应 (需求 3.4)', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Complete response"}]}}]}\n',
        'data: [DONE]\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Complete response');
    });

    test('应记录首字节时间 (TTFB) (需求 3.4)', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"test"}]}}]}\n',
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
        'data: {"candidates":[{"content":{"parts":[{"text":"No DONE marker"}]}}]}\n',
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

    test('应处理空的 parts 数组', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"Valid text"}]}}]}\n',
        'data: [DONE]\n',
      ];
      
      const mockStream = createMockStream(chunks);
      
      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });
      
      const result = await service.sendRequest('Hello');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Valid text');
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 30000,
      });
    });

    test('应在请求失败时抛出错误 (需求 3.5)', async () => {
      const error = new Error('Network error');
      error.response = {
        status: 500,
        data: { error: { message: 'Internal server error' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow('Network error');
    });

    test('应处理 401 认证错误 (需求 3.5)', async () => {
      const error = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: { error: { message: 'Invalid API key' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理 403 权限错误 (需求 3.5)', async () => {
      const error = new Error('Forbidden');
      error.response = {
        status: 403,
        data: { error: { message: 'Permission denied' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理 429 速率限制错误 (需求 3.5)', async () => {
      const error = new Error('Rate limited');
      error.response = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理 500 服务器错误 (需求 3.5)', async () => {
      const error = new Error('Server error');
      error.response = {
        status: 500,
        data: { error: { message: 'Internal server error' } },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理 Gemini 特有的错误格式 (需求 3.5)', async () => {
      const error = new Error('API Error');
      error.response = {
        status: 400,
        data: {
          error: {
            code: 400,
            message: 'Invalid argument: contents',
            status: 'INVALID_ARGUMENT',
          },
        },
      };
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });
  });

  describe('超时处理', () => {
    test('应使用配置的超时时间', async () => {
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
        timeout: 5000,
      });
      
      const mockResponse = {
        data: { candidates: [{ content: { parts: [{ text: 'test' }] } }] },
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
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-api-key',
        requestType: 'non-stream',
      });
      
      const mockResponse = {
        data: { candidates: [{ content: { parts: [{ text: 'test' }] } }] },
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
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
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
      service = new GeminiService({
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-api-key',
        requestType: 'stream',
        timeout: 30000,
      });
    });

    test('应处理流中断错误 (需求 3.5)', async () => {
      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Partial"}]}}]}\n',
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

    test('应处理 DNS 解析失败', async () => {
      const error = new Error('getaddrinfo ENOTFOUND generativelanguage.googleapis.com');
      error.code = 'ENOTFOUND';
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });

    test('应处理流式请求超时', async () => {
      const error = new Error('timeout of 30000ms exceeded');
      error.code = 'ECONNABORTED';
      
      axios.post.mockRejectedValue(error);
      
      await expect(service.sendRequest('Hello')).rejects.toThrow();
    });
  });
});
