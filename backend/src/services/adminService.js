const crypto = require('crypto');
const { pool } = require('../config/db');

function httpError(status, message, code = 'ADMIN_ACTION_FAILED') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireReason(value) {
  const reason = String(value || '').trim();
  if (reason.length < 4 || reason.length > 500) {
    throw httpError(422, '操作原因需要 4-500 个字符', 'INVALID_REASON');
  }
  return reason;
}

function requireInteger(value, name, min, max) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw httpError(422, `${name}必须是 ${min}-${max} 的整数`, 'INVALID_NUMBER');
  }
  return parsed;
}

function requestHash(req) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ method: req.method, path: req.originalUrl, body: req.body || {} }))
    .digest('hex');
}

async function writeAudit(client, req, entry) {
  await client.query(
    `INSERT INTO admin_audit_logs
      (admin_id, admin_username, admin_role, action, target_type, target_id, reason,
       before_data, after_data, metadata, request_id, idempotency_key, ip_address, user_agent, success, error_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      req.admin.id,
      req.admin.username,
      req.admin.role,
      entry.action,
      entry.targetType,
      entry.targetId == null ? null : String(entry.targetId),
      entry.reason || null,
      entry.before == null ? null : JSON.stringify(entry.before),
      entry.after == null ? null : JSON.stringify(entry.after),
      JSON.stringify(entry.metadata || {}),
      req.requestId,
      entry.idempotencyKey || null,
      req.ip,
      String(req.headers['user-agent'] || '').slice(0, 255),
      entry.success !== false,
      entry.errorCode || null,
    ]
  );
}

async function runAdminMutation(req, res, definition, work) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return res.status(422).json({ error: '写操作需要有效 Idempotency-Key', requestId: req.requestId });
  }

  const hash = requestHash(req);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `INSERT INTO admin_idempotency_keys
        (admin_id, idempotency_key, request_hash, method, path)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (admin_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [req.admin.id, idempotencyKey, hash, req.method, req.originalUrl]
    );
    if (!claimed.rowCount) {
      // A concurrent insert waits on the unique index. This SELECT then sees and
      // locks the committed request instead of surfacing a duplicate-key 500.
      const prior = await client.query(
      `SELECT request_hash, status, response_status, response_body
       FROM admin_idempotency_keys
       WHERE admin_id = $1 AND idempotency_key = $2
       FOR UPDATE`,
      [req.admin.id, idempotencyKey]
      );
      const row = prior.rows[0];
      if (!row) throw httpError(409, '幂等请求状态暂不可用，请稍后重试', 'IDEMPOTENCY_UNAVAILABLE');
      if (row.request_hash !== hash) throw httpError(409, '幂等键已用于其他请求', 'IDEMPOTENCY_CONFLICT');
      await client.query('COMMIT');
      if (row.status === 'completed') {
        return res.status(row.response_status).json({ ...row.response_body, replayed: true });
      }
      return res.status(409).json({ error: '相同请求仍在处理中', requestId: req.requestId });
    }

    const result = await work(client);
    const status = result.status || 200;
    const body = { ...result.body, requestId: req.requestId };
    await writeAudit(client, req, {
      action: definition.action,
      targetType: definition.targetType,
      targetId: result.targetId ?? definition.targetId,
      reason: result.reason ?? definition.reason,
      before: result.before,
      after: result.after,
      metadata: result.metadata,
      idempotencyKey,
    });
    await client.query(
      `UPDATE admin_idempotency_keys
       SET status = 'completed', response_status = $3, response_body = $4, completed_at = NOW()
       WHERE admin_id = $1 AND idempotency_key = $2`,
      [req.admin.id, idempotencyKey, status, JSON.stringify(body)]
    );
    await client.query('COMMIT');
    return res.status(status).json(body);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  httpError,
  requireReason,
  requireInteger,
  runAdminMutation,
  writeAudit,
};
