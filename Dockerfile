# ===================================
# 多阶段构建 - 构建阶段
# ===================================
FROM node:18-alpine AS builder

# 安装编译工具（better-sqlite3需要）
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --omit=dev

# ===================================
# 多阶段构建 - 运行阶段
# ===================================
FROM node:18-alpine

# 安装运行时依赖
RUN apk add --no-cache sqlite dumb-init

WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制项目文件
COPY . .

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/logs && \
    chmod -R 777 /app/data /app/logs

# 暴露端口
EXPOSE 8998

# 挂载数据卷
VOLUME ["/app/data", "/app/logs"]

# 设置环境变量
ENV NODE_ENV=production \
    PORT=8998

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8998/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用dumb-init处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server-new.js"]

