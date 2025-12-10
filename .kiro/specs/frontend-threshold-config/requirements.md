# 需求文档

## 简介

本功能旨在将自动测压模式的阈值配置从环境变量迁移到前端界面，使用户能够在测压控制台中直接配置成功率阈值和最大连续失败次数。同时优化 docker-compose.yml 中的环境变量配置，使其正确读取 .env 文件中的值，并进行其他代码质量优化。

## 术语表

- **AutoCeya**: AI模型自动测压系统
- **RPM**: 每分钟请求数（Requests Per Minute）
- **成功率阈值**: 当本分钟成功率低于此百分比时，判定为承受不住并停止测试
- **最大连续失败次数**: 当连续失败次数达到此值时，判定为承受不住并停止测试
- **自动测压模式**: 从起始RPM逐步递增直到达到承受极限的测试模式
- **固定测压模式**: 使用固定RPM持续测试的模式

## 需求

### 需求 1

**用户故事:** 作为测压用户，我希望在前端界面配置自动测压的阈值参数，以便根据不同的测试场景灵活调整判定标准。

#### 验收标准

1. WHEN 用户选择自动测压模式 THEN AutoCeya 系统 SHALL 显示成功率阈值和最大连续失败次数的配置输入框
2. WHEN 用户选择固定测压模式 THEN AutoCeya 系统 SHALL 隐藏阈值配置输入框
3. WHEN 用户将成功率阈值设置为0 THEN AutoCeya 系统 SHALL 跳过成功率判定逻辑
4. WHEN 用户将最大连续失败次数设置为0 THEN AutoCeya 系统 SHALL 跳过连续失败判定逻辑
5. WHEN 用户输入阈值配置 THEN AutoCeya 系统 SHALL 将配置保存到浏览器本地存储

### 需求 2

**用户故事:** 作为测压用户，我希望阈值配置有合理的默认值和输入验证，以便避免配置错误导致测试异常。

#### 验收标准

1. WHEN 前端页面加载 THEN AutoCeya 系统 SHALL 显示成功率阈值默认值为75，最大连续失败次数默认值为20
2. WHEN 用户输入成功率阈值 THEN AutoCeya 系统 SHALL 验证输入值在0到100之间
3. WHEN 用户输入最大连续失败次数 THEN AutoCeya 系统 SHALL 验证输入值为非负整数
4. WHEN 用户输入无效值 THEN AutoCeya 系统 SHALL 阻止表单提交并显示错误提示

### 需求 3

**用户故事:** 作为测压用户，我希望前端配置的阈值能够正确传递到后端并生效，以便测试按照我的配置执行。

#### 验收标准

1. WHEN 用户启动自动测压 THEN AutoCeya 系统 SHALL 将前端配置的阈值参数发送到后端
2. WHEN 后端接收到阈值参数 THEN AutoCeya 系统 SHALL 使用前端传递的值覆盖环境变量默认值
3. WHEN 前端未传递阈值参数 THEN AutoCeya 系统 SHALL 使用环境变量中的默认值
4. WHEN 自动测压检测到过载 THEN AutoCeya 系统 SHALL 根据前端配置的阈值进行判定

### 需求 4

**用户故事:** 作为系统管理员，我希望 docker-compose.yml 正确读取 .env 文件中的环境变量，以便统一管理配置。

#### 验收标准

1. WHEN Docker 容器启动 THEN AutoCeya 系统 SHALL 从 .env 文件读取 DEFAULT_SUCCESS_THRESHOLD 的值
2. WHEN Docker 容器启动 THEN AutoCeya 系统 SHALL 从 .env 文件读取 DEFAULT_MAX_FAILURES 的值
3. WHEN Docker 容器启动 THEN AutoCeya 系统 SHALL 从 .env 文件读取 DEFAULT_RESPONSE_TIME_THRESHOLD 的值
4. WHEN .env 文件中未定义某个环境变量 THEN AutoCeya 系统 SHALL 使用 docker-compose.yml 中定义的默认值

### 需求 5

**用户故事:** 作为测压用户，我希望界面清晰地说明阈值配置的作用和适用范围，以便正确理解和使用这些配置。

#### 验收标准

1. WHEN 阈值配置输入框显示 THEN AutoCeya 系统 SHALL 在输入框下方显示说明文字，解释该配置的作用
2. WHEN 阈值配置输入框显示 THEN AutoCeya 系统 SHALL 明确标注"0表示不判定"的含义
3. WHEN 用户切换到自动测压模式 THEN AutoCeya 系统 SHALL 显示提示信息说明阈值配置仅对自动测压生效

### 需求 6

**用户故事:** 作为系统管理员，我希望后端对阈值参数进行验证，以便防止无效配置导致系统异常。

#### 验收标准

1. WHEN 后端接收到成功率阈值参数 THEN AutoCeya 系统 SHALL 验证该值为0到100之间的数字
2. WHEN 后端接收到最大连续失败次数参数 THEN AutoCeya 系统 SHALL 验证该值为非负整数
3. WHEN 后端接收到无效的阈值参数 THEN AutoCeya 系统 SHALL 返回400错误并说明原因

### 需求 7

**用户故事:** 作为开发者，我希望 .env.example 文件与实际使用的环境变量保持同步，以便新用户能够正确配置系统。

#### 验收标准

1. WHEN 开发者查看 .env.example 文件 THEN AutoCeya 系统 SHALL 包含所有可配置的环境变量及其说明
2. WHEN 开发者查看 .env.example 文件 THEN AutoCeya 系统 SHALL 为每个环境变量提供合理的默认值示例
