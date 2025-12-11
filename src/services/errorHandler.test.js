/**
 * 错误处理单元测试
 * 测试 AIRequestService 的错误处理逻辑
 * 验证需求: 5.1, 5.2, 5.3, 5.4
 */
const { EventEmitter } = require('events');
const axios = require('axios');
const { AIRequestService } = require('./aiService');

// 模拟 axios
jest.mock('axios');

/**
 * 创建模拟的流对象
 * @param {Array<string>} chunks - 要发送的数据块数组
 * @param {boolean} shouldError - 是否触发错误
 * @param {Error} errorObj - 自定义错误对象
 * @returns {EventEmitter} 模拟的流对象
 */
function createMockStream(chunks, shouldError = false, errorObj = null) {
  const stream = new EventEmitter();
  
  setTimeout(() => {
    for (const chunk of chunks) {
      stream.emit('data', Buffer.from(chunk));
    }
    
    if (shouldError) {
      stream.emit('error', errorObj || new Error('流中断错误'));
    } else {
      stream.emit('end');
    }
  }, 10);
  
  return stream;
}

describe('AIRequestService 错误处理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('超时错误处理 (需求 5.1)', () => {
    test('应正确识别并返回超时错误信息 - OpenAI', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
        timeout: 1000,
      });

      const error = new Error('timeout of 1000ms exceeded');
      error.code = 'ECONNABORTED';
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('请求超时');
      expect(result.requestType).toBe('non-stream');
    });

    test('应正确识别并返回超时错误信息 - Claude', async () => {
      const service = new AIRequestService('claude', {
        url: 'https://api.anthropic.com',
        modelName: 'claude-3-opus',
        apiKey: 'test-key',
        requestType: 'non-stream',
        timeout: 5000,
      });

      const error = new Error('timeout of 5000ms exceeded');
      error.code = 'ECONNABORTED';
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('请求超时');
    });

    test('应正确识别并返回超时错误信息 - Gemini', async () => {
      const service = new AIRequestService('gemini', {
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-key',
        requestType: 'non-stream',
        timeout: 3000,
      });

      const error = new Error('timeout of 3000ms exceeded');
      error.code = 'ECONNABORTED';
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('请求超时');
    });

    test('流式请求超时应返回正确的错误信息', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'stream',
        timeout: 1000,
      });

      const error = new Error('timeout of 1000ms exceeded');
      error.code = 'ECONNABORTED';
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('请求超时');
      expect(result.requestType).toBe('stream');
    });
  });


  describe('4xx 客户端错误处理 (需求 5.2)', () => {
    test('应正确处理 400 错误并提取错误消息', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Bad Request');
      error.response = {
        status: 400,
        data: { error: { message: '无效的请求参数' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('无效的请求参数');
    });

    test('应正确处理 401 认证错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'invalid-key',
        requestType: 'non-stream',
      });

      const error = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: { error: { message: 'Invalid API key' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toBe('API 密钥无效或权限不足');
    });

    test('应正确处理 403 权限错误', async () => {
      const service = new AIRequestService('gemini', {
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Forbidden');
      error.response = {
        status: 403,
        data: { error: { message: 'Permission denied' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toBe('API 密钥无效或权限不足');
    });

    test('应正确处理 404 错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'invalid-model',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Not Found');
      error.response = {
        status: 404,
        data: { error: { message: 'Model not found' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toBe('Model not found');
    });

    test('应正确处理 429 速率限制错误', async () => {
      const service = new AIRequestService('claude', {
        url: 'https://api.anthropic.com',
        modelName: 'claude-3-opus',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Too Many Requests');
      error.response = {
        status: 429,
        data: { error: { message: 'Rate limit exceeded' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(429);
      expect(result.error).toBe('Rate limit exceeded');
    });

    test('应处理没有 error.message 字段的 4xx 错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Bad Request');
      error.response = {
        status: 400,
        data: { message: '请求格式错误' },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('请求格式错误');
    });

    test('应处理没有详细错误信息的 4xx 错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Bad Request');
      error.response = {
        status: 422,
        data: {},
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(422);
      expect(result.error).toContain('客户端错误');
    });
  });


  describe('5xx 服务器错误处理 (需求 5.3)', () => {
    test('应正确处理 500 内部服务器错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Internal Server Error');
      error.response = {
        status: 500,
        data: { error: { message: 'Internal server error' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe('Internal server error');
    });

    test('应正确处理 502 网关错误', async () => {
      const service = new AIRequestService('claude', {
        url: 'https://api.anthropic.com',
        modelName: 'claude-3-opus',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Bad Gateway');
      error.response = {
        status: 502,
        data: { error: { message: 'Bad gateway' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(502);
      expect(result.error).toBe('Bad gateway');
    });

    test('应正确处理 503 服务不可用错误', async () => {
      const service = new AIRequestService('gemini', {
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Service Unavailable');
      error.response = {
        status: 503,
        data: { error: { message: 'Service temporarily unavailable' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(503);
      expect(result.error).toBe('Service temporarily unavailable');
    });

    test('应正确处理 504 网关超时错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Gateway Timeout');
      error.response = {
        status: 504,
        data: { error: { message: 'Gateway timeout' } },
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(504);
      expect(result.error).toBe('Gateway timeout');
    });

    test('应处理没有详细错误信息的 5xx 错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Internal Server Error');
      error.response = {
        status: 500,
        data: {},
      };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain('服务器错误');
    });
  });


  describe('流中断错误处理 (需求 5.4)', () => {
    test('应正确处理 OpenAI 流中断错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'stream',
      });

      const chunks = [
        'data: {"choices":[{"delta":{"content":"部分"}}]}\n',
      ];
      const mockStream = createMockStream(chunks, true, new Error('连接中断'));

      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('连接中断');
    });

    test('应正确处理 Claude 流中断错误', async () => {
      const service = new AIRequestService('claude', {
        url: 'https://api.anthropic.com',
        modelName: 'claude-3-opus',
        apiKey: 'test-key',
        requestType: 'stream',
      });

      const chunks = [
        'data: {"type":"content_block_delta","delta":{"text":"部分内容"}}\n',
      ];
      const mockStream = createMockStream(chunks, true, new Error('流意外终止'));

      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('流意外终止');
    });

    test('应正确处理 Gemini 流中断错误', async () => {
      const service = new AIRequestService('gemini', {
        url: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-pro',
        apiKey: 'test-key',
        requestType: 'stream',
      });

      const chunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"部分"}]}}]}\n',
      ];
      const mockStream = createMockStream(chunks, true, new Error('网络中断'));

      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('网络中断');
    });

    test('流中断时应返回正确的响应时间', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'stream',
      });

      const chunks = [
        'data: {"choices":[{"delta":{"content":"test"}}]}\n',
      ];
      const mockStream = createMockStream(chunks, true);

      axios.post.mockResolvedValue({
        data: mockStream,
        status: 200,
      });

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.responseTime).toBeDefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });


  describe('网络错误处理', () => {
    test('应正确处理 DNS 解析失败', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://invalid-domain.example.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('getaddrinfo ENOTFOUND invalid-domain.example.com');
      error.code = 'ENOTFOUND';
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('域名解析失败');
    });

    test('应正确处理连接被拒绝', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://localhost:9999',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('connect ECONNREFUSED 127.0.0.1:9999');
      error.code = 'ECONNREFUSED';
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('连接被拒绝');
    });

    test('应处理未知错误并返回错误消息', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('未知的网络错误');
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBe('未知的网络错误');
    });

    test('应处理没有消息的错误', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error();
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('响应格式验证', () => {
    test('错误响应应包含所有必需字段', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      const error = new Error('Test error');
      error.response = { status: 500, data: {} };
      axios.post.mockRejectedValue(error);

      const result = await service.execute('Hello');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('requestType');
    });

    test('成功响应应包含所有必需字段', async () => {
      const service = new AIRequestService('openai', {
        url: 'https://api.openai.com',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        requestType: 'non-stream',
      });

      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: 'Hello' } }] },
        status: 200,
      });

      const result = await service.execute('Hello');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('status', 200);
      expect(result).toHaveProperty('content', 'Hello');
      expect(result).toHaveProperty('requestType', 'non-stream');
    });
  });
});
