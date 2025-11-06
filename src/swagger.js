const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoCeya API 文档',
      version: '2.0.0',
      description: 'AI模型自动测压系统 API 接口文档',
      contact: {
        name: 'AutoCeya',
        url: 'https://github.com/bohesocool/autoCeya',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: '本地开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'string',
          description: '使用登录接口返回的token',
        },
      },
    },
    tags: [
      {
        name: '认证',
        description: '用户认证相关接口',
      },
      {
        name: '测压',
        description: '压力测试相关接口',
      },
      {
        name: '历史记录',
        description: '测试历史记录管理',
      },
    ],
  },
  apis: [
    './src/routes/*.js',      // 扫描路由文件中的 swagger 注释
    'src/routes/*.js',        // 备用路径
  ],
};

/**
 * 配置 Swagger UI
 */
const setupSwagger = (app) => {
  try {
    // 动态生成 specs（延迟到调用时）
    const specs = swaggerJsdoc(options);
    
    console.log('Swagger specs生成成功，找到的API数量:', Object.keys(specs.paths || {}).length);
    
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'AutoCeya API 文档',
      })
    );
    
    console.log('✓ Swagger UI 已成功挂载到 /api-docs');
    return true;
  } catch (error) {
    console.error('✗ Swagger初始化失败:', error.message);
    console.error('  可能原因: 路由文件中的注释格式有误或路径配置错误');
    throw error;
  }
};

module.exports = setupSwagger;

