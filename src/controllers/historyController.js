const db = require('../../database');
const { AppError } = require('../middlewares/errorHandler');

/**
 * 获取历史记录列表
 */
const getHistoryList = (req, res) => {
  const { page, pageSize } = req.query;
  const result = db.getHistoryList(page, pageSize);
  res.json(result);
};

/**
 * 获取单条历史记录详情
 */
const getHistoryDetail = (req, res) => {
  const { id } = req.params;
  const detail = db.getHistoryDetail(id);
  
  if (!detail) {
    throw new AppError('历史记录不存在', 404);
  }
  
  res.json(detail);
};

/**
 * 删除历史记录
 */
const deleteHistory = (req, res) => {
  const { id } = req.params;
  const success = db.deleteHistory(id);
  
  if (!success) {
    throw new AppError('历史记录不存在', 404);
  }
  
  res.json({ success: true, message: '删除成功' });
};

/**
 * 清空所有历史记录
 */
const clearHistory = (req, res) => {
  db.clearAllHistory();
  res.json({ success: true, message: '所有历史记录已清空' });
};

module.exports = {
  getHistoryList,
  getHistoryDetail,
  deleteHistory,
  clearHistory,
};

