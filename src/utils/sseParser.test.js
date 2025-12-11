/**
 * SSE 解析器单元测试
 * 测试 SSE 流解析的各种场景
 */
const { EventEmitter } = require('events');
const SSEParser = require('./sseParser');

/**
 * 创建模拟的流对象
 * @param {Array<string>} chunks - 要发送的数据块数组
 * @param {boolean} shouldError - 是否触发错误
 * @param {number} delay - 每个块之间的延迟（毫秒）
 * @returns {EventEmitter} 模拟的流对象
 */
function createMockStream(chunks, shouldError = false, delay = 0) {
  const stream = new EventEmitter();
  
  // 异步发送数据块
  setTimeout(() => {
    let index = 0;
    
    const sendNext = () => {
      if (index < chunks.length) {
        stream.emit('data', Buffer.from(chunks[index]));
        index++;
        
        if (delay > 0) {
          setTimeout(sendNext, delay);
        } else {
          sendNext();
        }
      } else {
        if (shouldError) {
          stream.emit('error', new Error('模拟流错误'));
        } else {
          stream.emit('end');
        }
      }
    };
    
    sendNext();
  }, 10);
  
  return stream;
}

describe('SSEParser - parseStream', () => {
  describe('完整 SSE 流解析', () => {
    test('应正确解析包含多个数据块的完整 SSE 流', (done) => {
      const chunks = [
        'data: {"content":"Hello"}\n',
        'data: {"content":" World"}\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(2);
          expect(receivedData[0]).toEqual({ content: 'Hello' });
          expect(receivedData[1]).toEqual({ content: ' World' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应正确解析单个数据块的 SSE 流', (done) => {
      const chunks = [
        'data: {"message":"test"}\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(1);
          expect(receivedData[0]).toEqual({ message: 'test' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应跳过空行和注释行', (done) => {
      const chunks = [
        '\n',
        ': this is a comment\n',
        'data: {"content":"valid"}\n',
        '\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(1);
          expect(receivedData[0]).toEqual({ content: 'valid' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应在流自然结束时调用 onEnd', (done) => {
      const chunks = [
        'data: {"content":"test"}\n'
      ];
      
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        () => {},
        () => {
          // 流正常结束
          done();
        },
        (error) => done(error)
      );
    });
  });

  describe('不完整数据行处理', () => {
    test('应正确处理跨多个块的数据行', (done) => {
      const chunks = [
        'data: {"con',
        'tent":"split',
        ' message"}\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(1);
          expect(receivedData[0]).toEqual({ content: 'split message' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应保留缓冲区中的不完整行直到接收完整', (done) => {
      const chunks = [
        'data: {"first":"complete"}\n',
        'data: {"second":',
        '"incomplete"}\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(2);
          expect(receivedData[0]).toEqual({ first: 'complete' });
          expect(receivedData[1]).toEqual({ second: 'incomplete' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应处理多行同时到达的情况', (done) => {
      const chunks = [
        'data: {"line":1}\ndata: {"line":2}\ndata: {"line":3}\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(3);
          expect(receivedData[0]).toEqual({ line: 1 });
          expect(receivedData[1]).toEqual({ line: 2 });
          expect(receivedData[2]).toEqual({ line: 3 });
          done();
        },
        (error) => done(error)
      );
    });
  });

  describe('[DONE] 标记处理', () => {
    test('应在收到 [DONE] 标记时立即结束流处理', (done) => {
      const chunks = [
        'data: {"content":"before"}\n',
        'data: [DONE]\n',
        'data: {"content":"after"}\n'  // 这个不应该被处理
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(1);
          expect(receivedData[0]).toEqual({ content: 'before' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应处理 [DONE] 标记前后有空格的情况', (done) => {
      const chunks = [
        'data: {"content":"test"}\n',
        'data:   [DONE]  \n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          expect(receivedData).toHaveLength(1);
          done();
        },
        (error) => done(error)
      );
    });

    test('应在没有 [DONE] 标记时通过流结束事件完成', (done) => {
      const chunks = [
        'data: {"content":"test"}\n'
      ];
      
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        () => {},
        () => {
          // 通过流的 end 事件完成
          done();
        },
        (error) => done(error)
      );
    });
  });

  describe('错误处理', () => {
    test('应捕获流错误并调用 onError', (done) => {
      const chunks = ['data: {"content":"test"}\n'];
      const stream = createMockStream(chunks, true);
      
      SSEParser.parseStream(
        stream,
        () => {},
        () => done(new Error('不应该调用 onEnd')),
        (error) => {
          expect(error).toBeDefined();
          expect(error.message).toBe('模拟流错误');
          done();
        }
      );
    });

    test('应忽略无法解析的 JSON 数据行并继续处理', (done) => {
      const chunks = [
        'data: {"valid":"json"}\n',
        'data: {invalid json}\n',
        'data: {"another":"valid"}\n',
        'data: [DONE]\n'
      ];
      
      const receivedData = [];
      const stream = createMockStream(chunks);
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          // 应该只接收到两个有效的 JSON 对象
          expect(receivedData).toHaveLength(2);
          expect(receivedData[0]).toEqual({ valid: 'json' });
          expect(receivedData[1]).toEqual({ another: 'valid' });
          done();
        },
        (error) => done(error)
      );
    });

    test('应防止在流结束后继续处理数据', (done) => {
      const stream = new EventEmitter();
      const receivedData = [];
      let endCallCount = 0;
      
      SSEParser.parseStream(
        stream,
        (data) => receivedData.push(data),
        () => {
          endCallCount++;
        },
        (error) => done(error)
      );
      
      // 发送数据并结束
      stream.emit('data', Buffer.from('data: {"content":"test"}\n'));
      stream.emit('data', Buffer.from('data: [DONE]\n'));
      
      // 尝试在结束后发送更多数据
      setTimeout(() => {
        stream.emit('data', Buffer.from('data: {"content":"after"}\n'));
        stream.emit('end');
        
        setTimeout(() => {
          expect(receivedData).toHaveLength(1);
          expect(endCallCount).toBe(1);
          done();
        }, 50);
      }, 50);
    });

    test('应防止多次调用 onEnd', (done) => {
      const stream = new EventEmitter();
      let endCallCount = 0;
      
      SSEParser.parseStream(
        stream,
        () => {},
        () => {
          endCallCount++;
        },
        (error) => done(error)
      );
      
      // 先发送 [DONE]，然后触发 end 事件
      stream.emit('data', Buffer.from('data: [DONE]\n'));
      
      setTimeout(() => {
        stream.emit('end');
        
        setTimeout(() => {
          expect(endCallCount).toBe(1);
          done();
        }, 50);
      }, 50);
    });

    test('应防止多次调用 onError', (done) => {
      const stream = new EventEmitter();
      let errorCallCount = 0;
      
      SSEParser.parseStream(
        stream,
        () => {},
        () => {},
        (error) => {
          errorCallCount++;
        }
      );
      
      // 触发多次错误
      stream.emit('error', new Error('第一个错误'));
      
      setTimeout(() => {
        stream.emit('error', new Error('第二个错误'));
        
        setTimeout(() => {
          expect(errorCallCount).toBe(1);
          done();
        }, 50);
      }, 50);
    });
  });
});

describe('SSEParser - extractContent', () => {
  describe('OpenAI 格式提取', () => {
    test('应从 OpenAI 流式响应中提取内容', () => {
      const data = {
        choices: [
          {
            delta: {
              content: 'Hello World'
            }
          }
        ]
      };
      
      const content = SSEParser.extractContent(data, 'openai');
      expect(content).toBe('Hello World');
    });

    test('应处理 OpenAI 响应中没有内容的情况', () => {
      const data = {
        choices: [
          {
            delta: {}
          }
        ]
      };
      
      const content = SSEParser.extractContent(data, 'openai');
      expect(content).toBeNull();
    });

    test('应处理 OpenAI 响应结构不完整的情况', () => {
      expect(SSEParser.extractContent({}, 'openai')).toBeNull();
      expect(SSEParser.extractContent({ choices: [] }, 'openai')).toBeNull();
      expect(SSEParser.extractContent({ choices: [{}] }, 'openai')).toBeNull();
    });
  });

  describe('Claude 格式提取', () => {
    test('应从 Claude 流式响应中提取内容', () => {
      const data = {
        delta: {
          text: 'Claude response'
        }
      };
      
      const content = SSEParser.extractContent(data, 'claude');
      expect(content).toBe('Claude response');
    });

    test('应处理 Claude 响应中没有内容的情况', () => {
      const data = {
        delta: {}
      };
      
      const content = SSEParser.extractContent(data, 'claude');
      expect(content).toBeNull();
    });

    test('应处理 Claude 响应结构不完整的情况', () => {
      expect(SSEParser.extractContent({}, 'claude')).toBeNull();
      expect(SSEParser.extractContent({ delta: null }, 'claude')).toBeNull();
    });
  });

  describe('Gemini 格式提取', () => {
    test('应从 Gemini 流式响应中提取内容', () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Gemini response'
                }
              ]
            }
          }
        ]
      };
      
      const content = SSEParser.extractContent(data, 'gemini');
      expect(content).toBe('Gemini response');
    });

    test('应处理 Gemini 响应中没有内容的情况', () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [{}]
            }
          }
        ]
      };
      
      const content = SSEParser.extractContent(data, 'gemini');
      expect(content).toBeNull();
    });

    test('应处理 Gemini 响应结构不完整的情况', () => {
      expect(SSEParser.extractContent({}, 'gemini')).toBeNull();
      expect(SSEParser.extractContent({ candidates: [] }, 'gemini')).toBeNull();
      expect(SSEParser.extractContent({ candidates: [{}] }, 'gemini')).toBeNull();
    });
  });

  describe('通用错误处理', () => {
    test('应处理 null 或 undefined 数据', () => {
      expect(SSEParser.extractContent(null, 'openai')).toBeNull();
      expect(SSEParser.extractContent(undefined, 'openai')).toBeNull();
    });

    test('应处理非对象数据', () => {
      expect(SSEParser.extractContent('string', 'openai')).toBeNull();
      expect(SSEParser.extractContent(123, 'openai')).toBeNull();
      expect(SSEParser.extractContent(true, 'openai')).toBeNull();
    });

    test('应处理未知的提供商类型', () => {
      const data = { content: 'test' };
      expect(SSEParser.extractContent(data, 'unknown')).toBeNull();
    });

    test('应处理大小写不敏感的提供商名称', () => {
      const openaiData = {
        choices: [{ delta: { content: 'test' } }]
      };
      
      expect(SSEParser.extractContent(openaiData, 'OpenAI')).toBe('test');
      expect(SSEParser.extractContent(openaiData, 'OPENAI')).toBe('test');
    });
  });
});

describe('SSEParser - extractNonStreamContent', () => {
  describe('OpenAI 非流式格式提取', () => {
    test('应从 OpenAI 非流式响应中提取内容', () => {
      const data = {
        choices: [
          {
            message: {
              content: 'Complete response'
            }
          }
        ]
      };
      
      const content = SSEParser.extractNonStreamContent(data, 'openai');
      expect(content).toBe('Complete response');
    });

    test('应处理 OpenAI 非流式响应中没有内容的情况', () => {
      const data = {
        choices: [
          {
            message: {}
          }
        ]
      };
      
      const content = SSEParser.extractNonStreamContent(data, 'openai');
      expect(content).toBe('');
    });
  });

  describe('Claude 非流式格式提取', () => {
    test('应从 Claude 非流式响应中提取内容', () => {
      const data = {
        content: [
          {
            text: 'Claude complete response'
          }
        ]
      };
      
      const content = SSEParser.extractNonStreamContent(data, 'claude');
      expect(content).toBe('Claude complete response');
    });

    test('应处理 Claude 非流式响应中没有内容的情况', () => {
      const data = {
        content: [{}]
      };
      
      const content = SSEParser.extractNonStreamContent(data, 'claude');
      expect(content).toBe('');
    });
  });

  describe('Gemini 非流式格式提取', () => {
    test('应从 Gemini 非流式响应中提取内容', () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Gemini complete response'
                }
              ]
            }
          }
        ]
      };
      
      const content = SSEParser.extractNonStreamContent(data, 'gemini');
      expect(content).toBe('Gemini complete response');
    });

    test('应处理 Gemini 非流式响应中没有内容的情况', () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [{}]
            }
          }
        ]
      };
      
      const content = SSEParser.extractNonStreamContent(data, 'gemini');
      expect(content).toBe('');
    });
  });

  describe('通用错误处理', () => {
    test('应处理 null 或 undefined 数据', () => {
      expect(SSEParser.extractNonStreamContent(null, 'openai')).toBe('');
      expect(SSEParser.extractNonStreamContent(undefined, 'openai')).toBe('');
    });

    test('应处理非对象数据', () => {
      expect(SSEParser.extractNonStreamContent('string', 'openai')).toBe('');
      expect(SSEParser.extractNonStreamContent(123, 'openai')).toBe('');
    });

    test('应处理未知的提供商类型', () => {
      const data = { content: 'test' };
      expect(SSEParser.extractNonStreamContent(data, 'unknown')).toBe('');
    });
  });
});
