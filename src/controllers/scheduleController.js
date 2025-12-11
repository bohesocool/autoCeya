/**
 * ScheduleController - 定时任务控制器
 * 处理定时任务相关的 API 请求
 */
const scheduleService = require('../services/scheduleService');

/**
 * 创建定时任务
 * POST /api/schedules
 */
const createSchedule = (req, res) => {
  const schedule = scheduleService.create(req.body);
  res.status(201).json({
    success: true,
    message: '定时任务创建成功',
    data: schedule,
  });
};

/**
 * 获取所有定时任务
 * GET /api/schedules
 */
const getAllSchedules = (req, res) => {
  const schedules = scheduleService.getAll();
  res.json({
    success: true,
    data: schedules,
  });
};

/**
 * 获取单个任务详情
 * GET /api/schedules/:id
 */
const getScheduleById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: '无效的任务 ID',
    });
  }
  
  const schedule = scheduleService.getById(id);
  res.json({
    success: true,
    data: schedule,
  });
};


/**
 * 更新任务配置
 * PUT /api/schedules/:id
 */
const updateSchedule = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: '无效的任务 ID',
    });
  }
  
  const schedule = scheduleService.update(id, req.body);
  res.json({
    success: true,
    message: '定时任务更新成功',
    data: schedule,
  });
};

/**
 * 删除任务
 * DELETE /api/schedules/:id
 */
const deleteSchedule = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: '无效的任务 ID',
    });
  }
  
  scheduleService.delete(id);
  res.json({
    success: true,
    message: '定时任务删除成功',
  });
};

/**
 * 切换任务启用状态
 * POST /api/schedules/:id/toggle
 */
const toggleSchedule = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: '无效的任务 ID',
    });
  }
  
  const schedule = scheduleService.toggle(id);
  res.json({
    success: true,
    message: schedule.enabled ? '定时任务已启用' : '定时任务已禁用',
    data: schedule,
  });
};

module.exports = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
};
