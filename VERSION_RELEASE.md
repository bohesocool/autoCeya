# 📦 版本发布指南

## 🚀 如何发布新版本

### 方法一：使用Git标签发布（推荐）

这是最标准的版本管理方式，会自动构建并推送带版本号的Docker镜像。

#### 1️⃣ 发布新版本

```bash
# 确保代码已提交
git add .
git commit -m "feat: 添加新功能"

# 创建并推送版本标签（推荐使用语义化版本）
git tag v1.0.0
git push origin v1.0.0
```

#### 2️⃣ 自动生成的镜像标签

当你推送`v1.0.0`标签时，GitHub Actions会自动构建并推送以下镜像：

- `bohesocool/autoceya:latest` ✅ 最新版本
- `bohesocool/autoceya:1.0.0` ✅ 完整版本号
- `bohesocool/autoceya:1.0` ✅ 主版本.次版本
- `bohesocool/autoceya:1` ✅ 主版本号
- `bohesocool/autoceya:sha-abc1234` ✅ Git提交SHA

#### 3️⃣ 语义化版本规范

遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 规范：

```
v主版本号.次版本号.修订号

主版本号：不兼容的API修改
次版本号：向下兼容的功能性新增
修订号：向下兼容的问题修正
```

**示例：**
- `v1.0.0` - 首个稳定版本
- `v1.1.0` - 添加新功能，向下兼容
- `v1.1.1` - 修复bug
- `v2.0.0` - 重大更新，可能不兼容旧版本

---

### 方法二：直接推送到main分支

```bash
git add .
git commit -m "update: 更新功能"
git push origin main
```

**生成的镜像标签：**
- `bohesocool/autoceya:latest` - 最新开发版
- `bohesocool/autoceya:sha-abc1234` - Git提交SHA

⚠️ **注意**：这种方式只会更新`latest`标签，没有明确的版本号。

---

## 📋 完整发布流程示例

### 发布 v1.0.0 版本

```bash
# 1. 确保代码是最新的
git pull origin main

# 2. 进行开发和测试
# ... 修改代码 ...

# 3. 更新CHANGELOG.md
vim CHANGELOG.md

# 4. 提交所有更改
git add .
git commit -m "chore: 发布 v1.0.0"

# 5. 创建版本标签
git tag -a v1.0.0 -m "Release v1.0.0 - 首个稳定版本"

# 6. 推送代码和标签
git push origin main
git push origin v1.0.0

# 7. 等待GitHub Actions自动构建（约5-10分钟）
# 可以在 GitHub 仓库的 Actions 标签页查看构建进度
```

---

## 🎯 使用特定版本的镜像

### 在docker-compose.yml中指定版本

```yaml
services:
  autoceya:
    # 使用latest（自动获取最新版本）
    image: bohesocool/autoceya:latest
    
    # 或使用特定版本（推荐生产环境）
    # image: bohesocool/autoceya:1.0.0
    
    # 或使用主版本号（自动获取该主版本的最新次版本）
    # image: bohesocool/autoceya:1
```

### 命令行使用

```bash
# 拉取最新版本
docker pull bohesocool/autoceya:latest

# 拉取特定版本
docker pull bohesocool/autoceya:1.0.0

# 运行特定版本
docker run -d \
  -p 8998:8998 \
  -e AUTH_SECRET=your_password \
  bohesocool/autoceya:1.0.0
```

---

## 🔄 更新已部署的容器

```bash
# 1. 拉取最新镜像
docker-compose pull

# 2. 重新创建并启动容器
docker-compose up -d

# 或者一条命令完成
docker-compose pull && docker-compose up -d
```

---

## 📝 版本管理最佳实践

### ✅ 推荐做法

1. **生产环境使用固定版本号**
   ```yaml
   image: bohesocool/autoceya:1.0.0  # 明确版本，避免意外更新
   ```

2. **开发环境使用latest**
   ```yaml
   image: bohesocool/autoceya:latest  # 始终使用最新版本
   ```

3. **重大更新前做好测试**
   - 在测试环境先验证新版本
   - 确认功能正常后再更新生产环境

4. **保持CHANGELOG.md更新**
   - 每次版本发布都记录变更内容
   - 方便用户了解新功能和修复的问题

### ❌ 避免做法

- ❌ 生产环境使用`latest`标签（可能导致意外更新）
- ❌ 删除已发布的版本标签
- ❌ 跳过版本号（如从v1.0.0直接跳到v1.2.0）

---

## 🗑️ 删除版本标签（谨慎操作）

如果需要删除错误的标签：

```bash
# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin :refs/tags/v1.0.0

# 或者使用
git push origin --delete v1.0.0
```

⚠️ **警告**：删除已发布的标签可能会影响已部署的用户！

---

## 📊 查看所有版本

```bash
# 查看本地标签
git tag

# 查看远程标签
git ls-remote --tags origin

# 查看标签详细信息
git show v1.0.0
```

### 在Docker Hub查看

访问：https://hub.docker.com/r/bohesocool/autoceya/tags

---

## 🎉 示例版本历史

```
v1.0.0 (2025-11-05) - 首个稳定版本
  - ✨ 基础测压功能
  - ✨ 配置记忆功能
  - ✨ 后台持续运行

v1.1.0 (2025-11-06) - 功能增强
  - ✨ 添加总运行时间显示
  - ✨ 优化曲线图更新逻辑
  - ✨ 完善后台日志系统

v1.1.1 (2025-11-07) - Bug修复
  - 🐛 修复某个已知问题
  - 📝 更新文档
```

---

**Happy Releasing! 🚀**

