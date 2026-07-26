const roleRank = { auditor: 0, support: 1, operator: 2, owner: 3 };

function adminAuthorize(minimumRole) {
  return (req, res, next) => {
    if (!req.admin || roleRank[req.admin.role] < roleRank[minimumRole]) {
      return res.status(403).json({ error: '当前管理员权限不足', requestId: req.requestId });
    }
    next();
  };
}

module.exports = adminAuthorize;
