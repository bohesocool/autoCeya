const axios = require('axios');
const log = require('../utils/logger');

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
    
    const endpoint = requestType === 'stream' ? 'streamGenerateContent' : 'generateContent';
    const fullUrl = requestType === 'stream'
      ? `${url}/v1beta/models/${modelName}:${endpoint}?key=${apiKey}&alt=sse`
      : `${url}/v1beta/models/${modelName}:${endpoint}?key=${apiKey}`;

    const response = await axios.post(
      fullUrl,
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

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  }
}

/**
 * OpenAI AI 服务
 */
class OpenAIService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    
    // OpenAI API 端点
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

    const response = await axios.post(fullUrl, requestBody, {
      timeout: this.config.timeout || 150000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      // 如果是流式请求，需要特殊处理
      ...(requestType === 'stream' && {
        responseType: 'stream',
      }),
    });

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  }
}

/**
 * Claude AI 服务 (Anthropic)
 */
class ClaudeService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    
    // Claude API 端点
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

    const response = await axios.post(fullUrl, requestBody, {
      timeout: this.config.timeout || 150000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', // Claude 需要指定 API 版本
      },
      // 如果是流式请求，需要特殊处理
      ...(requestType === 'stream' && {
        responseType: 'stream',
      }),
    });

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
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
  }

  async execute(prompt) {
    const startTime = Date.now();
    
    try {
      const result = await this.service.sendRequest(prompt);
      const responseTime = Date.now() - startTime;

      log.debug('AI请求成功', {
        provider: this.providerType,
        model: this.service.config.modelName,
        responseTime,
      });

      return {
        success: true,
        responseTime,
        status: result.status,
        data: result.data,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const errorMessage = error.response?.data?.error?.message || error.message || '未知错误';
      
      log.warn('AI请求失败', {
        provider: this.providerType,
        model: this.service.config.modelName,
        responseTime,
        error: errorMessage,
        statusCode: error.response?.status,
      });

      return {
        success: false,
        responseTime,
        status: error.response?.status,
        error: errorMessage,
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

