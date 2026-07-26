const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const crypto = require('crypto');
const { query, pool } = require('../src/config/db');

const baseUrl = process.env.ADMIN_SMOKE_BASE_URL || 'http://127.0.0.1:3001';
const username = process.env.ADMIN_SMOKE_USERNAME || process.argv[2];
const password = process.env.ADMIN_SMOKE_PASSWORD || process.argv[3];

async function request(pathname, { method = 'GET', token, body, key } = {}) {
  const response = await fetch(baseUrl + pathname, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${pathname}: ${response.status} ${json.error}`);
  return json;
}

async function main() {
  if (!username || !password) throw new Error('需要 ADMIN_SMOKE_USERNAME 和 ADMIN_SMOKE_PASSWORD');
  const handshake = await request('/api/admin/handshake');
  if (handshake.apiVersion !== '1.0') throw new Error('管理 API 版本错误');
  const login = await request('/api/admin/auth/login', { method: 'POST', body: { username, password } });
  const token = login.token;
  const dashboard = await request('/api/admin/dashboard', { token });
  const players = await request('/api/admin/players?page=1&pageSize=10', { token });
  await request('/api/admin/catalogs', { token });
  const chats = await request('/api/admin/chats?page=1&pageSize=10', { token });
  await request('/api/admin/auctions?page=1&pageSize=10', { token });
  await request('/api/admin/audit?page=1&pageSize=10', { token });
  if (players.items[0]) await request(`/api/admin/players/${players.items[0].user_id}`, { token });

  const createKey = crypto.randomUUID();
  const createBody = {
    title: '[自动联调] 管理台公告',
    body: '此公告由自动化联调创建，并会在测试结束后清理。',
    priority: 0,
    pinned: false,
    status: 'draft',
    reason: '自动化联调验证',
  };
  const created = await request('/api/admin/announcements', { method: 'POST', token, key: createKey, body: createBody });
  const replayed = await request('/api/admin/announcements', { method: 'POST', token, key: createKey, body: createBody });
  if (!replayed.replayed || replayed.announcement.id !== created.announcement.id) throw new Error('幂等重放验证失败');
  const updateKey = crypto.randomUUID();
  const updated = await request(`/api/admin/announcements/${created.announcement.id}`, {
    method: 'PUT', token, key: updateKey,
    body: { ...createBody, status: 'withdrawn' },
  });
  if (updated.announcement.status !== 'withdrawn') throw new Error('公告更新验证失败');

  const requests = await query(
    `SELECT request_id FROM admin_audit_logs
     WHERE target_type='announcement' AND target_id=$1::text AND admin_username=$2`,
    [created.announcement.id, username]
  );
  if (requests.rowCount < 2) throw new Error('审计日志验证失败');

  await query('DELETE FROM announcements WHERE id=$1', [created.announcement.id]);
  await query('DELETE FROM admin_audit_logs WHERE request_id=ANY($1::uuid[])', [requests.rows.map((x) => x.request_id)]);
  await query('DELETE FROM admin_idempotency_keys WHERE idempotency_key=ANY($1::uuid[])', [[createKey, updateKey]]);

  let mailVerified = false;
  if (players.items[0]) {
    const mailKey = crypto.randomUUID();
    let mailId = null;
    try {
      const sent = await request(`/api/admin/players/${players.items[0].user_id}/mail`, {
        method: 'POST', token, key: mailKey,
        body: {
          title: '[自动联调] 管理台邮件',
          body: '验证管理台邮件可以真实写入玩家信箱。',
          quantity: 1,
          spiritStones: 0,
          expiresDays: 1,
          reason: '自动化联调邮件',
        },
      });
      mailId = sent.mail.id;
      const stored = await query('SELECT id FROM mail_messages WHERE id=$1', [mailId]);
      if (!stored.rows[0]) throw new Error('邮件写入验证失败');
      mailVerified = true;
    } finally {
      if (mailId) await query('DELETE FROM mail_messages WHERE id=$1', [mailId]);
      await query('DELETE FROM admin_audit_logs WHERE idempotency_key=$1', [mailKey]);
      await query('DELETE FROM admin_idempotency_keys WHERE idempotency_key=$1', [mailKey]);
    }
  }

  let chatModerationVerified = false;
  if (chats.items[0]) {
    const chatId = chats.items[0].id;
    const chatKey = crypto.randomUUID();
    const before = (await query(
      'SELECT moderation_status,moderated_by,moderated_at,moderation_reason FROM chat_messages WHERE id=$1',
      [chatId]
    )).rows[0];
    if (before) {
      const nextStatus = before.moderation_status === 'hidden' ? 'visible' : 'hidden';
      try {
        await request(`/api/admin/chats/${chatId}`, {
          method: 'PATCH', token, key: chatKey,
          body: { status: nextStatus, reason: '自动化联调聊天治理' },
        });
        const changed = await query('SELECT moderation_status FROM chat_messages WHERE id=$1', [chatId]);
        if (changed.rows[0]?.moderation_status !== nextStatus) throw new Error('聊天可见性变更验证失败');
        chatModerationVerified = true;
      } finally {
        await query(
          `UPDATE chat_messages
           SET moderation_status=$2,moderated_by=$3,moderated_at=$4,moderation_reason=$5
           WHERE id=$1`,
          [chatId, before.moderation_status, before.moderated_by, before.moderated_at, before.moderation_reason]
        );
        await query('DELETE FROM admin_audit_logs WHERE idempotency_key=$1', [chatKey]);
        await query('DELETE FROM admin_idempotency_keys WHERE idempotency_key=$1', [chatKey]);
      }
    }
  }

  console.log(JSON.stringify({
    ok: true,
    environment: handshake.environment,
    players: dashboard.summary.players,
    idempotencyReplay: true,
    auditVerified: true,
    mailVerified,
    chatModerationVerified,
    testDataCleaned: true,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
