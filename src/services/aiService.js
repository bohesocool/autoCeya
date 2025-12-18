const axios = require('axios');
const log = require('../utils/logger');
const SSEParser = require('../utils/sseParser');

/**
 * 从错误对象中提取详细的错误消息
 * @param {Error} error - 错误对象
 * @returns {string} 提取的错误消息
 */
function extractErrorMessage(error) {
  // 网络错误优先处理
  if (error.code === 'ECONNABORTED') return '请求超时';
  if (error.code === 'ENOTFOUND') return '域名解析失败';
  if (error.code === 'ECONNREFUSED') return '连接被拒绝';
  
  // API 响应错误
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // 按优先级尝试提取错误消息
    const message = 
      data?.error?.message ||      // OpenAI 格式
      data?.message ||              // 通用格式
      data?.error ||                // 简单错误字符串
      data?.detail ||               // FastAPI 格式
      data?.msg;                    // 其他格式
    
    if (message) {
      return typeof message === 'string' ? message : JSON.stringify(message);
    }
    
    // 如果没有标准错误字段,尝试提取响应体的关键信息
    if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        // 返回第一个有意义的字段值
        const firstKey = keys[0];
        const value = data[firstKey];
        return `${firstKey}: ${typeof value === 'string' ? value : JSON.stringify(value)}`;
      }
    }
    
    // 最后回退: 状态码 + 状态文本
    return `HTTP ${status}: ${error.response.statusText || '未知错误'}`;
  }
  
  // 其他错误
  return error.message || '未知错误';
}

/**
 * AI 服务基类
 */
class AIServiceBase {
  constructor(config) {
    this.config = config;
  }

  async sendRequest(prompt) {
    throw new Error('sendRequest 方法必须被子类实现');
  }
}

/**
 * Gemini AI 服务
 */
class GeminiService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    
    if (requestType === 'stream') {
      const fullUrl = `${url}/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;
      return this.sendStreamRequest(fullUrl, prompt);
    } else {
      const fullUrl = `${url}/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      return this.sendNonStreamRequest(fullUrl, prompt);
    }
  }

  async sendNonStreamRequest(url, prompt) {
    const response = await axios.post(
      url,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        timeout: this.config.timeout || 150000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // 提取文本内容
    const content = SSEParser.extractNonStreamContent(response.data, 'gemini');

    return {
      success: true,
      data: response.data,
      content,
      status: response.status,
    };
  }

  async sendStreamRequest(url, prompt) {
    return new Promise((resolve, reject) => {
      let fullContent = '';
      let firstByteTime = null;
      const startTime = Date.now();

      axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        },
        {
          timeout: this.config.timeout || 150000,
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      )
      .then((response) => {
        SSEParser.parseStream(
          response.data,
          (data) => {
            if (!firstByteTime) {
              firstByteTime = Date.now();
            }
            const content = SSEParser.extractContent(data, 'gemini');
            if (content) {
              fullContent += content;
            }
          },
          () => {
            resolve({
              success: true,
              content: fullContent,
              status: response.status,
              ttfb: firstByteTime ? firstByteTime - startTime : null,
            });
          },
          (error) => {
            reject(error);
          }
        );
      })
      .catch((error) => {
        reject(error);
      });
    });
  }
}

/**
 * OpenAI AI 服务
 */
class OpenAIService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    const fullUrl = `${url}/v1/chat/completions`;

    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: requestType === 'stream',
    };

    if (requestType === 'stream') {
      return this.sendStreamRequest(fullUrl, requestBody, apiKey);
    } else {
      return this.sendNonStreamRequest(fullUrl, requestBody, apiKey);
    }
  }

  async sendNonStreamRequest(url, body, apiKey) {
    const response = await axios.post(url, body, {
      timeout: this.config.timeout || 150000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    // 提取文本内容
    const content = SSEParser.extractNonStreamContent(response.data, 'openai');

    return {
      success: true,
      data: response.data,
      content,
      status: response.status,
    };
  }

  async sendStreamRequest(url, body, apiKey) {
    return new Promise((resolve, reject) => {
      let fullContent = '';
      let firstByteTime = null;
      const startTime = Date.now();

      axios.post(url, body, {
        timeout: this.config.timeout || 150000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        responseType: 'stream',
      })
      .then((response) => {
        SSEParser.parseStream(
          response.data,
          (data) => {
            if (!firstByteTime) {
              firstByteTime = Date.now();
            }
            const content = SSEParser.extractContent(data, 'openai');
            if (content) {
              fullContent += content;
            }
          },
          () => {
            resolve({
              success: true,
              content: fullContent,
              status: response.status,
              ttfb: firstByteTime ? firstByteTime - startTime : null,
            });
          },
          (error) => {
            reject(error);
          }
        );
      })
      .catch((error) => {
        reject(error);
      });
    });
  }
}

/**
 * Claude AI 服务 (Anthropic)
 */
class ClaudeService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    const fullUrl = `${url}/v1/messages`;

    const requestBody = {
      model: modelName,
      max_tokens: 4096, // Claude 需要指定最大 tokens
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: requestType === 'stream',
    };

    if (requestType === 'stream') {
      return this.sendStreamRequest(fullUrl, requestBody, apiKey);
    } else {
      return this.sendNonStreamRequest(fullUrl, requestBody, apiKey);
    }
  }

  async sendNonStreamRequest(url, body, apiKey) {
    const response = await axios.post(url, body, {
      timeout: this.config.timeout || 150000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    // 提取文本内容
    const content = SSEParser.extractNonStreamContent(response.data, 'claude');

    return {
      success: true,
      data: response.data,
      content,
      status: response.status,
    };
  }

  async sendStreamRequest(url, body, apiKey) {
    return new Promise((resolve, reject) => {
      let fullContent = '';
      let firstByteTime = null;
      const startTime = Date.now();

      axios.post(url, body, {
        timeout: this.config.timeout || 150000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        responseType: 'stream',
      })
      .then((response) => {
        SSEParser.parseStream(
          response.data,
          (data) => {
            if (!firstByteTime) {
              firstByteTime = Date.now();
            }
            // Claude 使用 delta.text
            const content = SSEParser.extractContent(data, 'claude');
            if (content) {
              fullContent += content;
            }
          },
          () => {
            resolve({
              success: true,
              content: fullContent,
              status: response.status,
              ttfb: firstByteTime ? firstByteTime - startTime : null,
            });
          },
          (error) => {
            reject(error);
          }
        );
      })
      .catch((error) => {
        reject(error);
      });
    });
  }
}

/**
 * AI 服务工厂
 */
class AIServiceFactory {
  static create(providerType, config) {
    switch (providerType.toLowerCase()) {
      case 'gemini':
        return new GeminiService(config);
      case 'openai':
        return new OpenAIService(config);
      case 'claude':
        return new ClaudeService(config);
      default:
        throw new Error(`不支持的AI提供商类型: ${providerType}`);
    }
  }
}

/**
 * 统一的 AI 请求接口
 */
class AIRequestService {
  constructor(providerType, config) {
    this.service = AIServiceFactory.create(providerType, config);
    this.providerType = providerType;
    this.requestType = config.requestType || 'non-stream';
  }

  async execute(prompt) {
    const startTime = Date.now();
    
    try {
      const result = await this.service.sendRequest(prompt);
      const responseTime = Date.now() - startTime;

      // 不再记录每个成功请求的日志，减少日志输出
      // log.debug('AI请求成功', {
      //   provider: this.providerType,
      //   model: this.service.config.modelName,
      //   responseTime,
      //   requestType: this.requestType,
      //   ttfb: result.ttfb,
      // });

      return {
        success: true,
        responseTime,
        status: result.status,
        content: result.content,
        data: result.data,
        requestType: this.requestType,
        ttfb: result.ttfb || null,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // 使用统一的错误消息提取函数
      const errorMessage = extractErrorMessage(error);
      
      // 不再记录每个失败请求的日志，改为在分钟统计中汇总
      // log.warn('AI请求失败', {
      //   provider: this.providerType,
      //   model: this.service.config.modelName,
      //   responseTime,
      //   error: errorMessage,
      //   statusCode: error.response?.status,
      //   requestType: this.requestType,
      // });

      return {
        success: false,
        responseTime,
        status: error.response?.status,
        error: errorMessage,
        requestType: this.requestType,
      };
    }
  }
}

module.exports = {
  AIServiceFactory,
  AIRequestService,
  GeminiService,
  OpenAIService,
  ClaudeService,
  extractErrorMessage,
};


