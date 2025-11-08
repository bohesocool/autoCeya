const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const testRoutes = require('./test');
const historyRoutes = require('./history');

// 挂载路由
router.use('/', authRoutes);
router.use('/', testRoutes);
router.use('/history', historyRoutes);

module.exports = router;


