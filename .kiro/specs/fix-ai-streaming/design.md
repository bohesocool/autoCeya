# 设计文档 - 修复 AI 服务流式和非流式请求

## 概述

本设计文档描述了如何修复 AI 服务中流式和非流式请求的处理逻辑。主要问题是当前实现虽然设置了流式请求参数，但没有正确处理 Server-Sent Events (SSE) 响应流。

## 架构

### 当前架构问题

```
┌─────────────────┐
│ StressTestService│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AIRequestService │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ❌ 问题：流式响应未处理
│  GeminiService  │────► 返回 Stream 对象
│  OpenAIService  │────► 返回 Stream 对象
│  ClaudeService  │────► 返回 Stream 对象
└─────────────────┘
```

### 改进后架构

```
┌─────────────────┐
│ StressTestService│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AIRequestService │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ✅ 解决：正确处理流式响应
│  GeminiService  │────► 解析 SSE → 返回完整文本
│  OpenAIService  │────► 解析 SSE → 返回完整文本
│  ClaudeService  │────► 解析 SSE → 返回完整文本
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ SSEParser Utility│  新增：SSE 解析工具
└─────────────────┘
```

## 组件和接口

### 1. SSE 解析工具类

```javascript
/**
 * SSE 事件解析器
 */
class SSEParser {
  /**
   * 解析 SSE 流
   * @param {Stream} stream - HTTP 响应流
   * @param {Function} onData - 数据块回调
   * @param {Function} onEnd - 结束回调
   * @param {Function} onError - 错误回调
   */
  static parseStream(stream, onData, onEnd, onError) {
    let buffer = '';
    
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的行
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onEnd();
            return;
          }
          try {
            const json = JSON.parse(data);
            onData(json);
          } catch (error) {
            // 忽略无法解析的行
          }
        }
      }
    });
    
    stream.on('end', () => onEnd());
    stream.on('error', (error) => onError(error));
  }
  
  /**
   * 从 SSE 数据中提取文本内容
   * @param {Object} data - SSE 数据对象
   * @param {String} provider - AI 提供商类型
   * @returns {String|null} - 提取的文本内容
   */
  static extractContent(data, provider) {
    switch (provider) {
      case 'openai':
        return data.choices?.[0]?.delta?.content || null;
      case 'claude':
        return data.delta?.text || null;
      case 'gemini':
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      default:
        return null;
    }
  }
}
```

### 2. 改进的 OpenAI 服务

```javascript
class OpenAIService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    const fullUrl = `${url}/v1/chat/completions`;

    const requestBody = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
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
    const content = response.data.choices?.[0]?.message?.content || '';

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
```

### 3. 改进的 Claude 服务

```javascript
class ClaudeService extends AIServiceBase {
  async sendRequest(prompt) {
    const { url, modelName, apiKey, requestType } = this.config;
    const fullUrl = `${url}/v1/messages`;

    const requestBody = {
      model: modelName,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
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
    const content = response.data.content?.[0]?.text || '';

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
            const content = data.delta?.text || null;
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
```

### 4. 改进的 Gemini 服务

```javascript
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
    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
```

## 数据模型

### 统一响应格式

```typescript
interface AIResponse {
  success: boolean;
  responseTime: number;  // 总响应时间（毫秒）
  status: number;        // HTTP 状态码
  content?: string;      // 响应文本内容（成功时）
  error?: string;        // 错误信息（失败时）
  ttfb?: number;        // 首字节时间（流式请求）
  requestType?: 'stream' | 'non-stream';  // 请求类型
}
```

## 正确性属性

*属性是一个特性或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 流式响应完整性
*对于任何* 流式请求，如果请求成功，则返回的 content 字段应包含完整的文本内容，而不是 Stream 对象或空字符串（除非 AI 真的返回空响应）
**验证需求: 1.3, 2.3, 3.3**

### 属性 2: 响应时间一致性
*对于任何* 请求，响应时间应该是从请求开始到完全接收响应的时间，且应该大于 0
**验证需求: 1.4, 2.4, 3.4, 4.3, 4.4**

### 属性 3: 错误处理完整性
*对于任何* 失败的请求，返回对象应包含 success=false、error 字段和 status 字段
**验证需求: 1.5, 2.5, 3.5, 5.1, 5.2, 5.3**

### 属性 4: 统一响应格式
*对于任何* AI 提供商（Gemini、OpenAI、Claude），成功响应应包含相同的字段结构（success、responseTime、status、content）
**验证需求: 4.1, 4.2**

### 属性 5: 内容提取正确性
*对于任何* 非流式请求，如果 API 返回成功，则 content 字段应该从响应 JSON 的正确路径提取文本
**验证需求: 1.1, 2.1, 3.1**

### 属性 6: SSE 解析正确性
*对于任何* 包含多个数据块的流式响应，所有数据块的文本内容应该被正确拼接，不丢失任何块
**验证需求: 1.3, 2.3, 3.3**

### 属性 7: TTFB 记录正确性
*对于任何* 流式请求，如果成功接收到数据，则 ttfb（首字节时间）应该小于总响应时间
**验证需求: 6.2**

## 错误处理

### 1. 网络错误
- 超时错误：返回 "请求超时" 错误信息
- 连接错误：返回 "连接失败" 错误信息
- DNS 错误：返回 "域名解析失败" 错误信息

### 2. API 错误
- 4xx 错误：提取 API 返回的错误消息
- 5xx 错误：返回 "服务器错误" 信息
- 认证错误：返回 "API 密钥无效" 信息

### 3. 流式响应错误
- 流中断：返回已接收的部分内容和错误信息
- JSON 解析错误：记录错误但继续处理其他数据块
- 超时：关闭流并返回已接收的内容

### 4. 数据提取错误
- 响应格式不符：返回 "响应格式错误" 信息
- 缺少必需字段：返回 "响应缺少必需字段" 信息

## 测试策略

### 单元测试

1. **SSE 解析器测试**
   - 测试解析完整的 SSE 流
   - 测试处理不完整的数据行
   - 测试处理 [DONE] 标记
   - 测试错误处理

2. **内容提取测试**
   - 测试从 OpenAI 响应提取内容
   - 测试从 Claude 响应提取内容
   - 测试从 Gemini 响应提取内容
   - 测试处理缺失字段

3. **服务类测试**
   - 测试非流式请求
   - 测试流式请求
   - 测试错误处理
   - 测试超时处理

### 属性测试

使用 `fast-check` 进行属性测试：

```javascript
// 属性 1: 流式响应完整性
test('流式响应应返回完整文本内容', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 1000 }), // 随机文本
      async (text) => {
        // 模拟流式响应
        const mockStream = createMockSSEStream(text);
        const result = await parseStreamResponse(mockStream);
        
        // 验证：返回的内容应该是字符串，不是 Stream 对象
        expect(typeof result.content).toBe('string');
        expect(result.content).toBe(text);
      }
    )
  );
});

// 属性 2: 响应时间一致性
test('响应时间应该大于 0', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('gemini', 'openai', 'claude'),
      fc.boolean(), // stream or not
      async (provider, isStream) => {
        const service = createMockService(provider);
        const result = await service.sendRequest('test', isStream);
        
        expect(result.responseTime).toBeGreaterThan(0);
      }
    )
  );
});
```

### 集成测试

1. **真实 API 测试**（需要真实 API 密钥）
   - 测试 OpenAI 流式和非流式请求
   - 测试 Claude 流式和非流式请求
   - 测试 Gemini 流式和非流式请求

2. **端到端测试**
   - 测试完整的测压流程
   - 测试统计数据的正确性
   - 测试错误恢复

## 性能考虑

1. **内存使用**
   - 流式响应使用增量拼接，避免大量中间对象
   - 及时清理已处理的数据块

2. **并发处理**
   - 每个请求独立处理，互不影响
   - 使用 Promise 管理异步流程

3. **错误恢复**
   - 流中断时保存已接收的内容
   - 超时后正确清理资源

## 向后兼容性

- 保持 `AIRequestService` 的公共接口不变
- 内部实现改进对上层透明
- 统一的响应格式便于未来扩展
