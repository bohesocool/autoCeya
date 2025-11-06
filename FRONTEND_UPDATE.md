# 🎨 前端更新说明 - v2.0

## ✅ 已完成的前端更新

### 1. 添加 AI 提供商选择器

在 `public/dashboard.html` 中添加了：

```html
<select id="providerType" onchange="updateProviderHints()">
    <option value="gemini">Gemini (Google)</option>
    <option value="openai">OpenAI (GPT)</option>
    <option value="claude">Claude (Anthropic)</option>
</select>
```

### 2. 智能提示系统

根据选择的AI提供商，自动更新URL和模型名称的提示：

| 提供商 | URL示例 | 模型示例 | API密钥格式 |
|--------|---------|----------|-------------|
| **Gemini** | `https://generativelanguage.googleapis.com` | `gemini-1.5-flash`, `gemini-1.5-pro` | 从 Google AI Studio 获取 |
| **OpenAI** | `https://api.openai.com` | `gpt-4`, `gpt-3.5-turbo` | 以 `sk-` 开头 |
| **Claude** | `https://api.anthropic.com` | `claude-3-opus-20240229` | 以 `sk-ant-` 开头 |

### 3. 配置保存和加载

自动保存和恢复AI提供商选择，下次打开页面时会记住你的选择。

### 4. 请求发送

启动测试时，会将 `providerType` 参数发送给后端：

```javascript
{
  providerType: 'gemini', // or 'openai' or 'claude'
  url: '...',
  modelName: '...',
  apiKey: '...',
  // ... 其他参数
}
```

---

## 🛠️ 代码更改清单

### 更新的文件：`public/dashboard.html`

1. **HTML结构** (第515-544行)
   - 添加AI提供商下拉选择器
   - 添加提示信息显示区域

2. **JavaScript函数** (第1318-1345行)
   - 新增 `updateProviderHints()` 函数

3. **启动测试** (第1348行)
   - 获取 `providerType` 参数

4. **请求发送** (第1392行)
   - 在请求体中包含 `providerType`

5. **配置保存** (第1202行)
   - 保存 `providerType` 到 localStorage

6. **配置加载** (第1232-1235行)
   - 从 localStorage 恢复 `providerType`

7. **页面初始化** (第787行)
   - 调用 `updateProviderHints()` 初始化提示

---

## 📸 界面效果

### 选择 Gemini
```
AI 提供商：[Gemini (Google) ▼]
URL: https://generativelanguage.googleapis.com
     示例：https://generativelanguage.googleapis.com
模型: gemini-1.5-flash
     示例：gemini-1.5-flash, gemini-1.5-pro, gemini-pro
密钥: ••••••••
     从 Google AI Studio 获取
```

### 选择 OpenAI
```
AI 提供商：[OpenAI (GPT) ▼]
URL: https://api.openai.com
     示例：https://api.openai.com 或第三方代理地址
模型: gpt-4
     示例：gpt-4, gpt-3.5-turbo, gpt-4-turbo
密钥: ••••••••
     以 sk- 开头的密钥
```

### 选择 Claude
```
AI 提供商：[Claude (Anthropic) ▼]
URL: https://api.anthropic.com
     示例：https://api.anthropic.com
模型: claude-3-opus-20240229
     示例：claude-3-opus-20240229, claude-3-sonnet-20240229
密钥: ••••••••
     以 sk-ant- 开头的密钥
```

---

## 🎯 使用方法

1. **选择 AI 提供商**
   - 打开测压控制台
   - 在"AI 提供商选择"下拉框中选择你要测试的模型

2. **输入对应信息**
   - 根据自动显示的提示信息
   - 填写对应的 URL、模型名称和 API 密钥

3. **启动测试**
   - 配置其他参数（RPM、测试语句等）
   - 点击"开始测压"
   - 系统会自动使用对应的API格式

---

## 🔄 兼容性

- ✅ 向后兼容：如果配置中没有 `providerType`，默认使用 Gemini
- ✅ 自动迁移：旧配置在加载时会自动添加默认的提供商
- ✅ 配置记忆：切换提供商后会自动保存

---

## ✨ 技术细节

### 请求格式差异

后端 `src/services/aiService.js` 已经实现了三种不同的请求格式：

**Gemini API：**
```javascript
POST /v1beta/models/gemini-1.5-flash:streamGenerateContent?key=xxx
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "prompt" }]
    }
  ]
}
```

**OpenAI API：**
```javascript
POST /v1/chat/completions
Headers: Authorization: Bearer sk-xxx
{
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "prompt" }
  ]
}
```

**Claude API：**
```javascript
POST /v1/messages
Headers: x-api-key: sk-ant-xxx
        anthropic-version: 2023-06-01
{
  "model": "claude-3-opus-20240229",
  "max_tokens": 4096,
  "messages": [
    { "role": "user", "content": "prompt" }
  ]
}
```

---

## 🐛 已修复的问题

1. ✅ 前端缺少AI提供商选择功能
2. ✅ 不同模型使用相同的请求格式（现在自动适配）
3. ✅ 用户不知道如何填写不同AI的参数（现在有提示）

---

**前端更新完成！现在可以轻松测试三种不同的AI模型了！** 🎉

