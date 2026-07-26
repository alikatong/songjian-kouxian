const { withTransaction } = require('../config/db');
const { getCharacterRow, addInventory } = require('../services/gameService');
const { playerPaging, pagedResult } = require('../utils/playerPagination');

const rarityOrder = "CASE x.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END";

function requestBody(req) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

async function characterOrThrow(client, userId, lock = false) {
  const character = await getCharacterRow(client, userId, lock);
  if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
  return character;
}

async function lockCharactersById(client, characterIds) {
  const ids = [...new Set(characterIds)].sort((left, right) => left - right);
  const characters = new Map();
  for (const id of ids) {
    const result = await client.query(
      'SELECT id, spirit_stones FROM characters WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (!result.rowCount) {
      const error = new Error('交易角色不存在'); error.status = 409; throw error;
    }
    characters.set(id, result.rows[0]);
  }
  return characters;
}

async function state(req, res, next) {
  try {
    const payload = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId);
      return {
        spirit_stones: Number(character.spirit_stones),
        system_auction_open: false,
      };
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function shop(req, res, next) {
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId);
      const total = Number((await client.query(
        `SELECT count(*) FROM shop_goods sg JOIN items i ON i.id = sg.item_id
         WHERE sg.active = TRUE AND sg.required_order <= $1`,
        [character.order_index],
      )).rows[0].count);
      const items = (await client.query(
        `SELECT sg.id, sg.price, i.code, i.name, i.type, i.rarity, i.description,
                i.image_url, i.major_realm, i.source_description
         FROM shop_goods sg JOIN items i ON i.id = sg.item_id
         WHERE sg.active = TRUE AND sg.required_order <= $1
         ORDER BY (i.major_realm = $2) DESC, sg.required_order DESC,
                  ${rarityOrder.replaceAll('x.', 'i.')}, i.name, i.code, sg.id
         LIMIT $3 OFFSET $4`,
        [character.order_index, character.major_realm, limit, offset],
      )).rows.map((item) => ({ ...item, price: Number(item.price) }));
      return pagedResult(items, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function listings(req, res, next) {
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId);
      const total = Number((await client.query(
        "SELECT count(*) FROM auction_listings WHERE status = 'active'",
      )).rows[0].count);
      const items = (await client.query(
        `SELECT al.id, al.quantity, al.unit_price, al.created_at, al.seller_character_id,
                c.name AS seller_name, i.code AS item_code, i.name AS item_name, i.type AS item_type,
                i.rarity AS item_rarity, i.image_url AS item_image_url,
                e.code AS equipment_code, e.name AS equipment_name, e.rarity AS equipment_rarity,
                e.image_url AS equipment_image_url, e.combat_role, e.weapon_type
         FROM auction_listings al JOIN characters c ON c.id = al.seller_character_id
         LEFT JOIN items i ON i.id = al.item_id LEFT JOIN equipment e ON e.id = al.equipment_id
         WHERE al.status = 'active'
         ORDER BY al.created_at DESC, al.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      )).rows.map((listing) => ({
        ...listing,
        unit_price: Number(listing.unit_price),
        is_own: listing.seller_character_id === character.id,
      }));
      return pagedResult(items, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

const sellableSource = `
  SELECT i.code, i.name, i.type, i.rarity, i.image_url, inv.quantity,
         'item'::text AS asset_type, NULL::varchar AS combat_role, NULL::varchar AS weapon_type
  FROM inventories inv JOIN items i ON i.id = inv.item_id
  WHERE inv.character_id = $1 AND inv.quantity > 0 AND inv.locked = FALSE
  UNION ALL
  SELECT e.code, e.name, NULL::varchar AS type, e.rarity, e.image_url, ce.quantity,
         'equipment'::text AS asset_type, e.combat_role, e.weapon_type
  FROM character_equipment ce JOIN equipment e ON e.id = ce.equipment_id
  WHERE ce.character_id = $1 AND ce.quantity > 0 AND ce.locked = FALSE AND ce.equipped_slot IS NULL
`;

async function sellable(req, res, next) {
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId);
      const total = Number((await client.query(
        `SELECT count(*) FROM (${sellableSource}) AS available_assets`,
        [character.id],
      )).rows[0].count);
      const items = (await client.query(
        `SELECT * FROM (${sellableSource}) AS available_assets
         ORDER BY ${rarityOrder.replaceAll('x.', 'available_assets.')}, name, asset_type, code
         LIMIT $2 OFFSET $3`,
        [character.id, limit, offset],
      )).rows;
      return pagedResult(items, total, page);
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function buyShop(req, res, next) {
  const body = requestBody(req);
  const quantity = Number(body.quantity ?? 1);
  if (typeof body.item_code !== 'string' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ error: '购买参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId, true);
      const good = (await client.query(
        `SELECT sg.price,i.code,i.name FROM shop_goods sg JOIN items i ON i.id=sg.item_id
         WHERE i.code=$1 AND sg.active=TRUE AND sg.required_order<=$2`,
        [body.item_code, character.order_index],
      )).rows[0];
      if (!good) { const error = new Error('坊市中没有这件商品'); error.status = 404; throw error; }
      const total = BigInt(good.price) * BigInt(quantity);
      if (BigInt(character.spirit_stones) < total) { const error = new Error(`购买需要 ${total} 枚灵石`); error.status = 409; throw error; }
      await client.query('UPDATE characters SET spirit_stones=spirit_stones-$1 WHERE id=$2', [total.toString(), character.id]);
      await addInventory(client, character.id, good.code, quantity);
      return { message: `购得${good.name} × ${quantity}，消耗 ${total} 灵石` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function createListing(req, res, next) {
  const body = requestBody(req);
  const quantity = Number(body.quantity ?? 1);
  const unitPrice = Number(body.unit_price);
  if (!['item', 'equipment'].includes(body.asset_type) || typeof body.code !== 'string'
    || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999
    || !Number.isSafeInteger(unitPrice) || unitPrice < 1 || unitPrice > 1000000000000
    || !Number.isSafeInteger(unitPrice * quantity)) {
    return res.status(400).json({ error: '上架参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId, true);
      const activeCount = Number((await client.query(
        "SELECT count(*) FROM auction_listings WHERE seller_character_id=$1 AND status='active'", [character.id],
      )).rows[0].count);
      if (activeCount >= 20) { const error = new Error('同时最多上架 20 件拍品'); error.status = 409; throw error; }
      const total = BigInt(unitPrice) * BigInt(quantity);
      const fee = (total * 2n + 99n) / 100n;
      if (BigInt(character.spirit_stones) < fee) { const error = new Error(`上架需要 ${fee} 枚灵石手续费`); error.status = 409; throw error; }
      let asset;
      if (body.asset_type === 'item') {
        asset = (await client.query(
          `SELECT i.id,i.name FROM inventories inv JOIN items i ON i.id=inv.item_id
           WHERE inv.character_id=$1 AND i.code=$2 AND inv.locked=FALSE AND inv.quantity>=$3 FOR UPDATE OF inv`,
          [character.id, body.code, quantity],
        )).rows[0];
        if (!asset) { const error = new Error('物品数量不足、已锁定或不可上架'); error.status = 409; throw error; }
        await client.query('UPDATE inventories SET quantity=quantity-$1 WHERE character_id=$2 AND item_id=$3', [quantity, character.id, asset.id]);
      } else {
        asset = (await client.query(
          `SELECT e.id,e.name FROM character_equipment ce JOIN equipment e ON e.id=ce.equipment_id
           WHERE ce.character_id=$1 AND e.code=$2 AND ce.locked=FALSE AND ce.equipped_slot IS NULL AND ce.quantity>=$3 FOR UPDATE OF ce`,
          [character.id, body.code, quantity],
        )).rows[0];
        if (!asset) { const error = new Error('器物数量不足、已锁定或正在装备'); error.status = 409; throw error; }
        await client.query('UPDATE character_equipment SET quantity=quantity-$1 WHERE character_id=$2 AND equipment_id=$3', [quantity, character.id, asset.id]);
      }
      await client.query('UPDATE characters SET spirit_stones=spirit_stones-$1 WHERE id=$2', [fee.toString(), character.id]);
      const listing = (await client.query(
        `INSERT INTO auction_listings(seller_character_id,item_id,equipment_id,quantity,unit_price)
         VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [character.id, body.asset_type === 'item' ? asset.id : null, body.asset_type === 'equipment' ? asset.id : null, quantity, unitPrice],
      )).rows[0];
      return { listing_id: listing.id, message: `${asset.name} 已上架，扣除 ${fee} 灵石手续费` };
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
}

async function buyListing(req, res, next) {
  const body = requestBody(req);
  const listingId = Number(body.listing_id);
  if (!Number.isSafeInteger(listingId) || listingId < 1) return res.status(400).json({ error: '拍品编号无效' });
  try {
    const result = await withTransaction(async (client) => {
      const buyer = await characterOrThrow(client, req.user.userId);
      const listing = (await client.query(
        `SELECT al.*,COALESCE(i.name,e.name) AS asset_name FROM auction_listings al
         LEFT JOIN items i ON i.id=al.item_id LEFT JOIN equipment e ON e.id=al.equipment_id
         WHERE al.id=$1 FOR UPDATE OF al`, [listingId],
      )).rows[0];
      if (!listing || listing.status !== 'active') { const error = new Error('拍品已下架或成交'); error.status = 409; throw error; }
      if (listing.seller_character_id === buyer.id) { const error = new Error('不能购买自己的拍品'); error.status = 409; throw error; }
      const characters = await lockCharactersById(client, [buyer.id, listing.seller_character_id]);
      const lockedBuyer = characters.get(buyer.id);
      const total = BigInt(listing.unit_price) * BigInt(listing.quantity);
      if (BigInt(lockedBuyer.spirit_stones) < total) { const error = new Error(`购买需要 ${total} 枚灵石`); error.status = 409; throw error; }
      const sellerIncome = total * 95n / 100n;
      await client.query('UPDATE characters SET spirit_stones=spirit_stones-$1 WHERE id=$2', [total.toString(), buyer.id]);
      await client.query(
        `INSERT INTO mail_messages(character_id,title,body,item_id,equipment_id,quantity)
         VALUES($1,'拍卖行购得物','拍品已送达，请领取附件。',$2,$3,$4)`,
        [buyer.id, listing.item_id, listing.equipment_id, listing.quantity],
      );
      await client.query(
        `INSERT INTO mail_messages(character_id,title,body,spirit_stones)
         VALUES($1,'拍品成交','成交款已扣除 5% 交易税，请领取附件。',$2)`,
        [listing.seller_character_id, sellerIncome.toString()],
      );
      await client.query("UPDATE auction_listings SET status='sold',buyer_character_id=$1,sold_at=NOW() WHERE id=$2", [buyer.id, listing.id]);
      return { message: `已拍下${listing.asset_name}，前往邮箱领取` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function cancelListing(req, res, next) {
  const body = requestBody(req);
  const listingId = Number(body.listing_id);
  if (!Number.isSafeInteger(listingId) || listingId < 1) return res.status(400).json({ error: '拍品编号无效' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId);
      const listing = (await client.query(
        `SELECT al.*,COALESCE(i.name,e.name) AS asset_name FROM auction_listings al
         LEFT JOIN items i ON i.id=al.item_id LEFT JOIN equipment e ON e.id=al.equipment_id
         WHERE al.id=$1 AND al.seller_character_id=$2 FOR UPDATE OF al`, [listingId, character.id],
      )).rows[0];
      if (!listing || listing.status !== 'active') { const error = new Error('拍品无法撤回'); error.status = 409; throw error; }
      await client.query(
        `INSERT INTO mail_messages(character_id,title,body,item_id,equipment_id,quantity)
         VALUES($1,'撤拍退回','拍品已撤回，请领取附件。',$2,$3,$4)`,
        [character.id, listing.item_id, listing.equipment_id, listing.quantity],
      );
      await client.query("UPDATE auction_listings SET status='cancelled' WHERE id=$1", [listing.id]);
      return { message: `${listing.asset_name}已撤拍，前往邮箱取回` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function mailState(req, res, next) {
  const { page, limit, offset } = playerPaging(req);
  try {
    const payload = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId);
      const total = Number((await client.query(
        `SELECT count(*) FROM mail_messages m
         WHERE m.character_id = $1 AND (m.claimed = TRUE OR m.expires_at > NOW())`,
        [character.id],
      )).rows[0].count);
      const unclaimed = Number((await client.query(
        `SELECT count(*) FROM mail_messages m
         WHERE m.character_id = $1 AND m.claimed = FALSE AND m.expires_at > NOW()`,
        [character.id],
      )).rows[0].count);
      const items = (await client.query(
        `SELECT m.id,m.title,m.body,m.quantity,m.spirit_stones,m.claimed,m.created_at,m.expires_at,
                i.code AS item_code,i.name AS item_name,i.image_url AS item_image_url,
                e.code AS equipment_code,e.name AS equipment_name,e.image_url AS equipment_image_url
         FROM mail_messages m LEFT JOIN items i ON i.id=m.item_id LEFT JOIN equipment e ON e.id=m.equipment_id
          WHERE m.character_id=$1 AND (m.claimed=TRUE OR m.expires_at>NOW())
          ORDER BY m.claimed, m.created_at DESC, m.id DESC
          LIMIT $2 OFFSET $3`, [character.id, limit, offset],
      )).rows.map((mail) => ({ ...mail, spirit_stones: Number(mail.spirit_stones) }));
      return { ...pagedResult(items, total, page), unclaimed };
    });
    return res.json(payload);
  } catch (error) { return next(error); }
}

async function claimMail(req, res, next) {
  const body = requestBody(req);
  const mailId = Number(body.mail_id);
  if (!Number.isSafeInteger(mailId) || mailId < 1) return res.status(400).json({ error: '邮件编号无效' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await characterOrThrow(client, req.user.userId, true);
      const mail = (await client.query(
        'SELECT * FROM mail_messages WHERE id=$1 AND character_id=$2 AND expires_at>NOW() FOR UPDATE', [mailId, character.id],
      )).rows[0];
      if (!mail || mail.claimed) { const error = new Error('邮件不存在、已过期或附件已领取'); error.status = 409; throw error; }
      if (mail.item_id) {
        await client.query(
          `INSERT INTO inventories(character_id,item_id,quantity) VALUES($1,$2,$3)
           ON CONFLICT(character_id,item_id) DO UPDATE SET quantity=inventories.quantity+EXCLUDED.quantity`,
          [character.id, mail.item_id, mail.quantity],
        );
      }
      if (mail.equipment_id) {
        await client.query(
          `INSERT INTO character_equipment(character_id,equipment_id,quantity) VALUES($1,$2,$3)
           ON CONFLICT(character_id,equipment_id) DO UPDATE SET quantity=character_equipment.quantity+EXCLUDED.quantity`,
          [character.id, mail.equipment_id, mail.quantity],
        );
      }
      if (Number(mail.spirit_stones) > 0) {
        await client.query('UPDATE characters SET spirit_stones=spirit_stones+$1 WHERE id=$2', [mail.spirit_stones, character.id]);
      }
      await client.query('UPDATE mail_messages SET claimed=TRUE WHERE id=$1', [mail.id]);
      return { message: '邮件附件已领取' };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

module.exports = {
  state, shop, listings, sellable, buyShop, createListing, buyListing, cancelListing, mailState, claimMail,
};
