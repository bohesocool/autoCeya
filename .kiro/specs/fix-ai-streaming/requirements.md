# 需求文档 - 修复 AI 服务流式和非流式请求

## 简介

当前 AI 服务实现存在严重问题：流式请求虽然设置了正确的参数，但没有正确处理流式响应数据。本需求旨在修复 OpenAI、Claude 和 Gemini 三个提供商的流式和非流式请求处理。

## 术语表

- **AI 服务 (AI Service)**: 与 AI 提供商 API 交互的服务类
- **流式请求 (Streaming Request)**: 使用 Server-Sent Events (SSE) 逐步返回响应的请求方式
- **非流式请求 (Non-Streaming Request)**: 一次性返回完整响应的请求方式
- **SSE (Server-Sent Events)**: 服务器向客户端推送事件流的标准协议
- **响应时间 (Response Time)**: 从发送请求到接收完整响应的时间（毫秒）

## 需求

### 需求 1: OpenAI 服务修复

**用户故事**: 作为系统管理员，我想要正确测试 OpenAI API 的流式和非流式请求，以便准确评估其性能。

#### 验收标准

1. WHEN 系统发送 OpenAI 非流式请求 THEN 系统应正确解析 JSON 响应并提取文本内容
2. WHEN 系统发送 OpenAI 流式请求 THEN 系统应正确解析 SSE 事件流并累积所有文本块
3. WHEN OpenAI 流式响应包含多个数据块 THEN 系统应正确拼接所有 delta.content 字段
4. WHEN OpenAI 流式响应结束（收到 [DONE]）THEN 系统应返回完整的响应文本和总响应时间
5. WHEN OpenAI 请求失败 THEN 系统应返回错误信息和状态码

### 需求 2: Claude 服务修复

**用户故事**: 作为系统管理员，我想要正确测试 Claude API 的流式和非流式请求，以便准确评估其性能。

#### 验收标准

1. WHEN 系统发送 Claude 非流式请求 THEN 系统应正确解析 JSON 响应并提取 content 数组中的文本
2. WHEN 系统发送 Claude 流式请求 THEN 系统应正确解析 SSE 事件流并处理不同的事件类型
3. WHEN Claude 流式响应包含 content_block_delta 事件 THEN 系统应提取 delta.text 并累积
4. WHEN Claude 流式响应包含 message_stop 事件 THEN 系统应结束流处理并返回完整响应
5. WHEN Claude 请求失败 THEN 系统应返回错误信息和状态码

### 需求 3: Gemini 服务修复

**用户故事**: 作为系统管理员，我想要正确测试 Gemini API 的流式和非流式请求，以便准确评估其性能。

#### 验收标准

1. WHEN 系统发送 Gemini 非流式请求 THEN 系统应正确解析 JSON 响应并提取 candidates 中的文本
2. WHEN 系统发送 Gemini 流式请求 THEN 系统应正确解析 SSE 事件流并累积所有文本块
3. WHEN Gemini 流式响应包含多个数据块 THEN 系统应正确拼接所有 parts[0].text 字段
4. WHEN Gemini 流式响应结束 THEN 系统应返回完整的响应文本和总响应时间
5. WHEN Gemini 请求失败 THEN 系统应返回错误信息和状态码

### 需求 4: 统一响应格式

**用户故事**: 作为开发者，我想要所有 AI 服务返回统一的响应格式，以便简化上层业务逻辑。

#### 验收标准

1. WHEN 任何 AI 服务请求成功 THEN 系统应返回包含 success、responseTime、status、content 字段的对象
2. WHEN 任何 AI 服务请求失败 THEN 系统应返回包含 success、responseTime、status、error 字段的对象
3. WHEN 流式请求完成 THEN 响应时间应为从请求开始到流结束的总时间
4. WHEN 非流式请求完成 THEN 响应时间应为从请求开始到响应返回的时间
5. WHEN 响应包含内容 THEN content 字段应包含完整的文本内容（非 Stream 对象）

### 需求 5: 错误处理增强

**用户故事**: 作为系统管理员，我想要详细的错误信息，以便快速定位问题。

#### 验收标准

1. WHEN 网络请求超时 THEN 系统应返回明确的超时错误信息
2. WHEN API 返回 4xx 错误 THEN 系统应提取并返回 API 的错误消息
3. WHEN API 返回 5xx 错误 THEN 系统应返回服务器错误信息
4. WHEN 流式响应中断 THEN 系统应捕获错误并返回已接收的部分内容
5. WHEN JSON 解析失败 THEN 系统应返回解析错误信息

### 需求 6: 性能监控

**用户故事**: 作为系统管理员，我想要监控流式和非流式请求的性能差异，以便优化测试策略。

#### 验收标准

1. WHEN 记录请求日志 THEN 日志应包含请求类型（stream/non-stream）
2. WHEN 流式请求完成 THEN 日志应包含首字节时间（TTFB）和总响应时间
3. WHEN 非流式请求完成 THEN 日志应包含总响应时间
4. WHEN 请求失败 THEN 日志应包含失败原因和错误类型
5. WHEN 系统运行测压 THEN 统计数据应区分流式和非流式请求的性能指标
