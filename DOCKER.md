# Docker 部署指南

## 快速开始

### 1. 使用 Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

### 2. 使用 Docker 命令

```bash
# 构建镜像
docker build -t autoceya:latest .

# 运行容器
docker run -d \
  --name autoceya \
  -p 8998:8998 \
  -e AUTH_SECRET=your_password \
  -e DEFAULT_RESPONSE_TIME_THRESHOLD=150000 \
  autoceya:latest

# 查看日志
docker logs -f autoceya

# 停止容器
docker stop autoceya

# 删除容器
docker rm autoceya
```

## 环境变量配置

在 `docker-compose.yml` 中或使用 `-e` 参数设置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 8998 |
| AUTH_SECRET | 登录密钥 | your_secure_password_here |
| DEFAULT_SUCCESS_THRESHOLD | 成功率阈值 | 80 |
| DEFAULT_MAX_FAILURES | 最大连续失败次数 | 10 |
| DEFAULT_RESPONSE_TIME_THRESHOLD | 响应超时阈值（毫秒） | 150000 |

## 数据持久化

如需保存日志，可在 `docker-compose.yml` 中添加卷挂载：

```yaml
volumes:
  - ./logs:/app/logs
  - ./data:/app/data
```

## 更新镜像

```bash
# 停止并删除旧容器
docker-compose down

# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 故障排查

### 查看容器状态
```bash
docker ps
docker-compose ps
```

### 查看详细日志
```bash
docker-compose logs -f --tail=100
```

### 进入容器
```bash
docker exec -it autoceya sh
```

### 重置容器
```bash
docker-compose down -v
docker-compose up -d
```

## 性能优化

### 资源限制

在 `docker-compose.yml` 中添加：

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 512M
```

## 安全建议

1. ✅ 修改默认的 `AUTH_SECRET`
2. ✅ 使用防火墙限制访问端口
3. ✅ 定期更新镜像
4. ✅ 不要在公网暴露未加密的HTTP服务

## 网络配置

如需自定义网络：

```yaml
networks:
  autoceya-network:
    driver: bridge

services:
  autoceya:
    networks:
      - autoceya-network
```

## 多实例部署

使用 Docker Swarm 或 Kubernetes 进行横向扩展：

```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.yml autoceya_stack
```

