# 使用Node.js官方镜像
FROM node:18-alpine

# 安装编译工具和SQLite（better-sqlite3需要）
RUN apk add --no-cache python3 make g++ sqlite

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制项目文件
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8998

# 挂载数据卷
VOLUME ["/app/data"]

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["node", "server.js"]

