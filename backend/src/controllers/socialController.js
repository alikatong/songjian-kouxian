const { withTransaction } = require('../config/db');
const { portraitUrls } = require('../services/gameService');
const { playerPaging, pagedResult } = require('../utils/playerPagination');

async function requireFriendship(client, userId, otherUserId) {
  const friendship = (await client.query(
    `SELECT id FROM friendships
     WHERE status = 'accepted' AND
       ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, otherUserId],
  )).rows[0];
  if (!friendship) { const error = new Error('只有互为好友才能私聊'); error.status = 403; throw error; }
}

function withFriendPresentation(friend) {
  return {
    ...friend,
    realm: friend.major_realm ? `${friend.major_realm}${friend.sub_stage || ''}` : '尚未创建角色',
    ...portraitUrls(friend.origin_code, friend.gender),
  };
}

function withPlayerPresentation(player) {
  return {
    ...player,
    realm: player.major_realm ? `${player.major_realm}${player.sub_stage || ''}` : '尚未创建角色',
  };
}

async function getFriends(req, res, next) {
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      const total = Number((await client.query(
        `SELECT count(*) FROM friendships f
         WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)`,
        [req.user.userId],
      )).rows[0].count);
      const friends = (await client.query(
        `SELECT f.id, u.username, c.name AS character_name,
                r.major_realm, r.sub_stage, c.last_online_at,
                o.code AS origin_code, c.gender
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
         LEFT JOIN characters c ON c.user_id = u.id
         LEFT JOIN realms r ON r.id = c.realm_id
         LEFT JOIN origins o ON o.id = c.origin_id
         WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
         ORDER BY c.last_online_at DESC NULLS LAST, u.username, f.id
         LIMIT $2 OFFSET $3`,
        [req.user.userId, limit, offset],
      )).rows.map(withFriendPresentation);
      return pagedResult(friends, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function getFriendRequests(req, res, next) {
  const direction = String(req.query.direction || 'incoming').trim();
  if (!['incoming', 'outgoing'].includes(direction)) {
    return res.status(400).json({ error: '好友申请方向无效' });
  }
  const { page, limit, offset } = playerPaging(req);
  const incoming = direction === 'incoming';
  const peerColumn = incoming ? 'requester_id' : 'addressee_id';
  const ownerColumn = incoming ? 'addressee_id' : 'requester_id';
  try {
    const payload = await withTransaction(async (client) => {
      const total = Number((await client.query(
        `SELECT count(*) FROM friendships f
         WHERE f.${ownerColumn} = $1 AND f.status = 'pending'`,
        [req.user.userId],
      )).rows[0].count);
      const requests = (await client.query(
        `SELECT f.id, u.username, c.name AS character_name, f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.${peerColumn}
         LEFT JOIN characters c ON c.user_id = u.id
         WHERE f.${ownerColumn} = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC, f.id DESC
         LIMIT $2 OFFSET $3`,
        [req.user.userId, limit, offset],
      )).rows;
      return pagedResult(requests, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function searchPlayers(req, res, next) {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.status(400).json({ error: '至少输入两个字进行搜索' });
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      const total = Number((await client.query(
        `SELECT count(*)
         FROM users u
         LEFT JOIN characters c ON c.user_id = u.id
         LEFT JOIN friendships f ON
           (f.requester_id = $1 AND f.addressee_id = u.id) OR
           (f.addressee_id = $1 AND f.requester_id = u.id)
         WHERE u.id <> $1 AND (u.username ILIKE $2 OR c.name ILIKE $2)`,
        [req.user.userId, `%${term}%`],
      )).rows[0].count);
      const players = (await client.query(
        `SELECT u.username, c.name AS character_name, r.major_realm, r.sub_stage,
                CASE
                  WHEN f.status = 'accepted' THEN 'friend'
                  WHEN f.status = 'pending' AND f.requester_id = $1 THEN 'sent'
                  WHEN f.status = 'pending' THEN 'received'
                  ELSE 'none'
                END AS relation
         FROM users u
         LEFT JOIN characters c ON c.user_id = u.id
         LEFT JOIN realms r ON r.id = c.realm_id
         LEFT JOIN friendships f ON
           (f.requester_id = $1 AND f.addressee_id = u.id) OR
           (f.addressee_id = $1 AND f.requester_id = u.id)
         WHERE u.id <> $1 AND (u.username ILIKE $2 OR c.name ILIKE $2)
         ORDER BY u.username, u.id, f.id
         LIMIT $3 OFFSET $4`,
        [req.user.userId, `%${term}%`, limit, offset],
      )).rows.map(withPlayerPresentation);
      return pagedResult(players, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function sendFriendRequest(req, res, next) {
  const username = String(req.body.username || '').trim();
  try {
    const result = await withTransaction(async (client) => {
      const target = (await client.query('SELECT id, username FROM users WHERE username = $1', [username])).rows[0];
      if (!target) { const error = new Error('没有找到这位玩家'); error.status = 404; throw error; }
      if (target.id === req.user.userId) { const error = new Error('不能添加自己为好友'); error.status = 400; throw error; }
      const existing = (await client.query(
        `SELECT * FROM friendships WHERE
         (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
        [req.user.userId, target.id],
      )).rows[0];
      if (existing) {
        const error = new Error(existing.status === 'accepted' ? '你们已经是好友' : '好友申请已经存在');
        error.status = 409; throw error;
      }
      await client.query(
        'INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)',
        [req.user.userId, target.id],
      );
      return { message: `已向${target.username}发送好友申请` };
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
}

async function respondFriendRequest(req, res, next) {
  const friendshipId = Number(req.body.friendship_id);
  const action = req.body.action;
  if (!Number.isInteger(friendshipId) || !['accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: '好友申请参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const friendship = (await client.query(
        `SELECT f.*, u.username FROM friendships f JOIN users u ON u.id = f.requester_id
         WHERE f.id = $1 AND f.addressee_id = $2 AND f.status = 'pending' FOR UPDATE OF f`,
        [friendshipId, req.user.userId],
      )).rows[0];
      if (!friendship) { const error = new Error('好友申请不存在或已处理'); error.status = 404; throw error; }
      if (action === 'accept') await client.query("UPDATE friendships SET status = 'accepted' WHERE id = $1", [friendshipId]);
      else await client.query('DELETE FROM friendships WHERE id = $1', [friendshipId]);
      return { message: action === 'accept' ? `已与${friendship.username}结为道友` : '已婉拒好友申请' };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function getMessages(req, res, next) {
  const channel = req.query.channel === 'direct' ? 'direct' : 'global';
  const friendUsername = String(req.query.friend || '').trim();
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      let friend = null;
      if (channel === 'direct') {
        friend = (await client.query('SELECT id, username FROM users WHERE username = $1', [friendUsername])).rows[0];
        if (!friend) { const error = new Error('私聊对象不存在'); error.status = 404; throw error; }
        await requireFriendship(client, req.user.userId, friend.id);
      }
      const total = Number((await client.query(
        channel === 'global'
          ? "SELECT count(*) FROM chat_messages WHERE channel = 'global' AND moderation_status = 'visible'"
          : `SELECT count(*) FROM chat_messages
             WHERE channel = 'direct' AND moderation_status = 'visible' AND
               ((sender_user_id = $1 AND recipient_user_id = $2) OR
                (sender_user_id = $2 AND recipient_user_id = $1))`,
        channel === 'global' ? [] : [req.user.userId, friend.id],
      )).rows[0].count);
      const messages = channel === 'global'
        ? (await client.query(
          `SELECT m.id, m.body, m.created_at, u.username, c.name AS character_name
           FROM chat_messages m JOIN users u ON u.id = m.sender_user_id
           LEFT JOIN characters c ON c.user_id = u.id
            WHERE m.channel = 'global' AND m.moderation_status = 'visible'
           ORDER BY m.created_at DESC, m.id DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        )).rows.reverse()
        : (await client.query(
          `SELECT m.id, m.body, m.created_at, u.username, c.name AS character_name
           FROM chat_messages m JOIN users u ON u.id = m.sender_user_id
           LEFT JOIN characters c ON c.user_id = u.id
            WHERE m.channel = 'direct' AND m.moderation_status = 'visible' AND
             ((m.sender_user_id = $1 AND m.recipient_user_id = $2) OR
              (m.sender_user_id = $2 AND m.recipient_user_id = $1))
           ORDER BY m.created_at DESC, m.id DESC
           LIMIT $3 OFFSET $4`,
          [req.user.userId, friend.id, limit, offset],
        )).rows.reverse();
      return pagedResult(messages, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function sendMessage(req, res, next) {
  const channel = req.body.channel === 'direct' ? 'direct' : 'global';
  const body = String(req.body.body || '').trim();
  const friendUsername = String(req.body.friend || '').trim();
  if (!body || body.length > 200) return res.status(400).json({ error: '消息需要 1-200 个字符' });
  try {
    const result = await withTransaction(async (client) => {
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.userId]);
      const recent = await client.query(
        "SELECT 1 FROM chat_messages WHERE sender_user_id = $1 AND created_at > NOW() - INTERVAL '3 seconds' LIMIT 1",
        [req.user.userId],
      );
      if (recent.rowCount) { const error = new Error('发言过快，请稍候三秒'); error.status = 429; throw error; }
      let recipient = null;
      if (channel === 'direct') {
        recipient = (await client.query('SELECT id, username FROM users WHERE username = $1', [friendUsername])).rows[0];
        if (!recipient) { const error = new Error('私聊对象不存在'); error.status = 404; throw error; }
        await requireFriendship(client, req.user.userId, recipient.id);
      }
      const message = (await client.query(
        `INSERT INTO chat_messages (sender_user_id, recipient_user_id, channel, body)
         VALUES ($1, $2, $3, $4) RETURNING id, body, created_at`,
        [req.user.userId, recipient?.id || null, channel, body],
      )).rows[0];
      return { message: '消息已发送', chat: message };
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
}

module.exports = {
  getFriends,
  getFriendRequests,
  searchPlayers,
  sendFriendRequest,
  respondFriendRequest,
  getMessages,
  sendMessage,
};
