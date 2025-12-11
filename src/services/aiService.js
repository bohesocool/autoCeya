const axios = require('axios');
const log = require('../utils/logger');
const SSEParser = require('../utils/sseParser');

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
      
      // 增强错误消息提取
      let errorMessage = '未知错误';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = '域名解析失败';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = '连接被拒绝';
      } else if (error.response) {
        // API 返回了错误响应
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          // 4xx 错误：客户端错误
          errorMessage = error.response.data?.error?.message || 
                        error.response.data?.message || 
                        `客户端错误 (${status})`;
          
          if (status === 401 || status === 403) {
            errorMessage = 'API 密钥无效或权限不足';
          }
        } else if (status >= 500) {
          // 5xx 错误：服务器错误
          errorMessage = error.response.data?.error?.message || 
                        `服务器错误 (${status})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
};


