const PLAYER_PAGE_SIZE = 10;

function playerPaging(req) {
  const value = Number.parseInt(req.query.page, 10);
  const page = Number.isInteger(value) && value > 0 ? value : 1;
  return {
    page,
    limit: PLAYER_PAGE_SIZE,
    offset: (page - 1) * PLAYER_PAGE_SIZE,
  };
}

function pagedResult(items, total, page) {
  const normalizedTotal = Number(total) || 0;
  return {
    items,
    total: normalizedTotal,
    page,
    pageSize: PLAYER_PAGE_SIZE,
    totalPages: Math.ceil(normalizedTotal / PLAYER_PAGE_SIZE),
  };
}

module.exports = { PLAYER_PAGE_SIZE, playerPaging, pagedResult };
