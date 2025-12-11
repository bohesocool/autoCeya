/**
 * 错误处理属性测试
 * 使用 fast-check 进行属性测试
 * 
 * **Feature: fix-ai-streaming, Property 3: 错误处理完整性**
 * **验证需求: 5.1, 5.2, 5.3**
 */
const fc = require('fast-check');
const axios = require('axios');
const { AIRequestService } = require('./aiService');

// 模拟 axios
jest.mock('axios');

/**
 * 生成有效的 AI 提供商类型
 */
const providerArb = fc.constantFrom('openai', 'claude', 'gemini');

/**
 * 生成有效的请求类型
 */
const requestTypeArb = fc.constantFrom('stream', 'non-stream');

/**
 * 生成 4xx 客户端错误状态码
 */
const clientErrorStatusArb = fc.constantFrom(400, 401, 403, 404, 422, 429);

/**
 * 生成 5xx 服务器错误状态码
 */
const serverErrorStatusArb = fc.constantFrom(500, 502, 503, 504);

/**
 * 生成网络错误代码
 */
const networkErrorCodeArb = fc.constantFrom('ECONNABORTED', 'ENOTFOUND', 'ECONNREFUSED');

/**
 * 生成错误消息
 */
const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * 创建服务配置
 */
function createServiceConfig(provider, requestType) {
  const configs = {
    openai: {
      url: 'https://api.openai.com',
      modelName: 'gpt-4',
      apiKey: 'test-key',
      requestType,
      timeout: 5000,
    },
    claude: {
      url: 'https://api.anthropic.com',
      modelName: 'claude-3-opus',
      apiKey: 'test-key',
      requestType,
      timeout: 5000,
    },
    gemini: {
      url: 'https://generativelanguage.googleapis.com',
      modelName: 'gemini-pro',
      apiKey: 'test-key',
      requestType,
      timeout: 5000,
    },
  };
  return configs[provider];
}

describe('错误处理属性测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: fix-ai-streaming, Property 3: 错误处理完整性**
   * **验证需求: 5.1, 5.2, 5.3**
   * 
   * 属性：对于任何失败的请求，返回对象应包含 success=false、error 字段和 status 字段（如果有 HTTP 响应）
   */
  describe('属性 3: 错误处理完整性', () => {
    /**
     * 测试超时错误处理 (需求 5.1)
     * 对于任何提供商和请求类型，超时错误应返回 success=false 和明确的超时错误信息
     */
    test('超时错误应返回 success=false 和错误信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          requestTypeArb,
          async (provider, requestType) => {
            const config = createServiceConfig(provider, requestType);
            const service = new AIRequestService(provider, config);

            // 模拟超时错误
            const error = new Error('timeout exceeded');
            error.code = 'ECONNABORTED';
            axios.post.mockRejectedValue(error);

            const result = await service.execute('test prompt');

            // 验证属性：
            // 1. success 应该为 false
            expect(result.success).toBe(false);
            
            // 2. 应该有 error 字段
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error).toBe('请求超时');
            
            // 3. 应该有 responseTime 字段
            expect(result.responseTime).toBeDefined();
            expect(typeof result.responseTime).toBe('number');
            expect(result.responseTime).toBeGreaterThanOrEqual(0);
            
            // 4. 应该有 requestType 字段
            expect(result.requestType).toBe(requestType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 测试 4xx 客户端错误处理 (需求 5.2)
     * 对于任何提供商、请求类型和 4xx 状态码，应返回 success=false、error 和 status 字段
     */
    test('4xx 客户端错误应返回 success=false、error 和 status 字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          requestTypeArb,
          clientErrorStatusArb,
          errorMessageArb,
          async (provider, requestType, statusCode, errorMsg) => {
            const config = createServiceConfig(provider, requestType);
            const service = new AIRequestService(provider, config);

            // 模拟 4xx 错误
            const error = new Error('Client Error');
            error.response = {
              status: statusCode,
              data: { error: { message: errorMsg } },
            };
            axios.post.mockRejectedValue(error);

            const result = await service.execute('test prompt');

            // 验证属性：
            // 1. success 应该为 false
            expect(result.success).toBe(false);
            
            // 2. 应该有 error 字段
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            
            // 3. 应该有 status 字段，且等于错误状态码
            expect(result.status).toBe(statusCode);
            
            // 4. 应该有 responseTime 字段
            expect(result.responseTime).toBeDefined();
            expect(typeof result.responseTime).toBe('number');
            
            // 5. 应该有 requestType 字段
            expect(result.requestType).toBe(requestType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 测试 5xx 服务器错误处理 (需求 5.3)
     * 对于任何提供商、请求类型和 5xx 状态码，应返回 success=false、error 和 status 字段
     */
    test('5xx 服务器错误应返回 success=false、error 和 status 字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          requestTypeArb,
          serverErrorStatusArb,
          errorMessageArb,
          async (provider, requestType, statusCode, errorMsg) => {
            const config = createServiceConfig(provider, requestType);
            const service = new AIRequestService(provider, config);

            // 模拟 5xx 错误
            const error = new Error('Server Error');
            error.response = {
              status: statusCode,
              data: { error: { message: errorMsg } },
            };
            axios.post.mockRejectedValue(error);

            const result = await service.execute('test prompt');

            // 验证属性：
            // 1. success 应该为 false
            expect(result.success).toBe(false);
            
            // 2. 应该有 error 字段
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            
            // 3. 应该有 status 字段，且等于错误状态码
            expect(result.status).toBe(statusCode);
            
            // 4. 应该有 responseTime 字段
            expect(result.responseTime).toBeDefined();
            expect(typeof result.responseTime).toBe('number');
            
            // 5. 应该有 requestType 字段
            expect(result.requestType).toBe(requestType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 测试网络错误处理
     * 对于任何提供商、请求类型和网络错误代码，应返回 success=false 和对应的错误信息
     */
    test('网络错误应返回 success=false 和对应的错误信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          requestTypeArb,
          networkErrorCodeArb,
          async (provider, requestType, errorCode) => {
            const config = createServiceConfig(provider, requestType);
            const service = new AIRequestService(provider, config);

            // 模拟网络错误
            const error = new Error('Network Error');
            error.code = errorCode;
            axios.post.mockRejectedValue(error);

            const result = await service.execute('test prompt');

            // 验证属性：
            // 1. success 应该为 false
            expect(result.success).toBe(false);
            
            // 2. 应该有 error 字段
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            
            // 3. 错误信息应该对应网络错误类型
            const expectedErrors = {
              'ECONNABORTED': '请求超时',
              'ENOTFOUND': '域名解析失败',
              'ECONNREFUSED': '连接被拒绝',
            };
            expect(result.error).toBe(expectedErrors[errorCode]);
            
            // 4. 应该有 responseTime 字段
            expect(result.responseTime).toBeDefined();
            expect(typeof result.responseTime).toBe('number');
            
            // 5. 应该有 requestType 字段
            expect(result.requestType).toBe(requestType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 测试错误响应格式一致性
     * 对于任何类型的错误，响应格式应该一致
     */
    test('所有错误响应应包含必需的字段结构', async () => {
      // 生成各种错误类型
      const errorTypeArb = fc.constantFrom('timeout', 'client', 'server', 'network');
      
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          requestTypeArb,
          errorTypeArb,
          async (provider, requestType, errorType) => {
            const config = createServiceConfig(provider, requestType);
            const service = new AIRequestService(provider, config);

            // 根据错误类型创建不同的错误
            let error;
            switch (errorType) {
              case 'timeout':
                error = new Error('timeout');
                error.code = 'ECONNABORTED';
                break;
              case 'client':
                error = new Error('Client Error');
                error.response = { status: 400, data: { error: { message: 'Bad Request' } } };
                break;
              case 'server':
                error = new Error('Server Error');
                error.response = { status: 500, data: { error: { message: 'Internal Error' } } };
                break;
              case 'network':
                error = new Error('Network Error');
                error.code = 'ENOTFOUND';
                break;
            }
            axios.post.mockRejectedValue(error);

            const result = await service.execute('test prompt');

            // 验证所有错误响应都有一致的字段结构
            // 1. 必须有 success 字段且为 false
            expect(result).toHaveProperty('success', false);
            
            // 2. 必须有 responseTime 字段且为数字
            expect(result).toHaveProperty('responseTime');
            expect(typeof result.responseTime).toBe('number');
            
            // 3. 必须有 error 字段且为非空字符串
            expect(result).toHaveProperty('error');
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            
            // 4. 必须有 requestType 字段
            expect(result).toHaveProperty('requestType');
            expect(result.requestType).toBe(requestType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
