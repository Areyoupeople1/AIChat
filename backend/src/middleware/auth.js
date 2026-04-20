const jwt = require('jsonwebtoken');

// 兼容两种 token 传递方式：
//   1. Authorization: Bearer <token>  (标准方式)
//   2. token: <token>                 (前端 request.js 现有方式)
module.exports = function authMiddleware(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.headers['token']) {
    token = req.headers['token'];
  }

  if (!token) {
    return res.status(401).json({ code: '-1', msg: '未提供认证令牌' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role }
    next();
  } catch {
    return res.status(401).json({ code: '-1', msg: '令牌无效或已过期' });
  }
};
