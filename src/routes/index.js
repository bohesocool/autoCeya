const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const testRoutes = require('./test');
const historyRoutes = require('./history');
const scheduleRoutes = require('./schedule');
const parallelRoutes = require('./parallel');

// 挂载路由
router.use('/', authRoutes);
router.use('/', testRoutes);
router.use('/history', historyRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/parallel', parallelRoutes);

module.exports = router;


