function combatStats(orderIndex) {
  const order = Math.max(0, Number(orderIndex) || 0);
  // 境界只提供固定的基础成长，主修可以随时换，不会影响已获得的基础属性。
  const multiplier = (100 + 22 * order + order * order) / 100;
  return {
    hp: Math.round(100 * multiplier),
    atk: Math.round(14 * multiplier),
    def: Math.round(8 * multiplier),
    spd: Math.round(12 * multiplier),
  };
}

function combatPower({ hp = 0, atk = 0, def = 0, spd = 0 }) {
  return Math.max(1, Math.round(Number(hp) * 0.18 + Number(atk) * 5 + Number(def) * 4 + Number(spd) * 2));
}

function effectiveHp(baseHp = 0, baseHpMax = 1, equipmentHp = 0) {
  const max = Math.max(1, Math.round(Number(baseHpMax) || 0));
  const bonus = Math.max(0, Math.round(Number(equipmentHp) || 0));
  return Math.min(max + bonus, Math.max(0, Math.round(Number(baseHp) || 0)) + bonus);
}

function baseHpAfterBattle(battleHp = 0, baseHpMax = 1, equipmentHp = 0) {
  const max = Math.max(1, Math.round(Number(baseHpMax) || 0));
  const bonus = Math.max(0, Math.round(Number(equipmentHp) || 0));
  return Math.min(max, Math.max(1, Math.floor(Number(battleHp) || 0) - bonus));
}

const battleTraits = {
  炼体: { name: '崩劲', description: '每三回合造成的伤害提高 30%' },
  护体: { name: '定身', description: '前两回合受到的伤害降低 35%' },
  身法: { name: '留影', description: '闪避率额外提高 10 个百分点' },
  sword: { name: '破锋', description: '攻击时无视对方 25% 防御' },
  saber: { name: '断流', description: '对气血低于一半的敌人增伤 25%' },
  spear: { name: '抢势', description: '首回合优先出手，且增伤 30%' },
  fan: { name: '回风', description: '成功闪避后，下次命中增伤 45%' },
  staff: { name: '伏雷', description: '每四回合的命中必定暴击' },
  armor: { name: '镇岳', description: '受到的暴击伤害额外降低 25%' },
  robe: { name: '回息', description: '每三回合结束时回复 5% 最大气血' },
  crown: { name: '照魄', description: '额外提高 8 个百分点暴击率' },
  boots: { name: '踏虚', description: '战斗中第一次受到的攻击必定闪避' },
  shield: { name: '守隙', description: '气血低于一半时受到的伤害降低 20%' },
};

function resolveBattle(player, enemy, random = Math.random) {
  const prepare = (stats, name) => ({
    ...stats, name, hp: Math.max(1, Number(stats.hp) || 1), maxHp: Number(stats.hp_max || stats.hp) || 1,
    traits: new Set(stats.traits), bootUsed: false, riposte: false,
  });
  const fighter = prepare(player, '你');
  const foe = prepare(enemy, enemy.name);
  const log = [];
  let round = 0;

  const strike = (attacker, defender) => {
    const speedEdge = (Number(attacker.spd) - Number(defender.spd)) / Math.max(1, Number(defender.spd));
    const dodgeChance = Math.max(0.02, Math.min(0.25, 0.05 - speedEdge * 0.12));
    const bootDodge = defender.traits.has('boots') && !defender.bootUsed;
    if (bootDodge || random() < dodgeChance + (defender.traits.has('身法') ? 0.10 : 0)) {
      if (bootDodge) defender.bootUsed = true;
      if (defender.traits.has('fan')) defender.riposte = true;
      log.push(`${defender.name}${bootDodge ? '以踏虚' : ''}避开了${attacker.name}的攻势`);
      return;
    }
    const critChance = Math.max(0.05, Math.min(0.25, 0.05 + Math.max(0, speedEdge) * 0.15));
    const thunder = attacker.traits.has('staff') && round % 4 === 0;
    const critical = thunder || random() < critChance + (attacker.traits.has('crown') ? 0.08 : 0);
    const variance = 0.9 + random() * 0.2;
    const defense = Number(defender.def) * (attacker.traits.has('sword') ? 0.75 : 1);
    // 高防御有收益，但不能把同级战斗长期压到每击 1 点伤害。
    const attack = Number(attacker.atk) * variance;
    let damage = Math.max(attack * 0.25, attack - defense * 0.55);
    const moves = [];
    if (attacker.traits.has('sword')) moves.push('破锋');
    if (thunder) moves.push('伏雷');
    if (attacker.traits.has('炼体') && round % 3 === 0) { damage *= 1.30; moves.push('崩劲'); }
    if (attacker.traits.has('spear') && round === 1) { damage *= 1.30; moves.push('抢势'); }
    if (attacker.traits.has('saber') && defender.hp < defender.maxHp / 2) { damage *= 1.25; moves.push('断流'); }
    if (attacker.riposte) { damage *= 1.45; attacker.riposte = false; moves.push('回风'); }
    if (defender.traits.has('护体') && round <= 2) { damage *= 0.65; moves.push('定身'); }
    if (defender.traits.has('shield') && defender.hp < defender.maxHp / 2) { damage *= 0.80; moves.push('守隙'); }
    if (critical) damage *= defender.traits.has('armor') ? 1.2 : 1.6;
    damage = Math.max(1, Math.round(damage));
    defender.hp = Math.max(0, defender.hp - damage);
    log.push(`${attacker.name}${critical ? '觅得破绽，重创' : '击中'}${defender.name}，造成${damage}点伤害${moves.length ? `（${moves.join('、')}）` : ''}`);
  };

  while (fighter.hp > 0 && foe.hp > 0 && round < 30) {
    round += 1;
    const playerFirst = Number(fighter.spd) >= Number(foe.spd) || (round === 1 && fighter.traits.has('spear'));
    const [first, second] = playerFirst ? [fighter, foe] : [foe, fighter];
    strike(first, second);
    if (second.hp > 0) strike(second, first);
    if (fighter.hp > 0 && foe.hp > 0 && fighter.traits.has('robe') && round % 3 === 0) {
      const healed = Math.min(fighter.maxHp - fighter.hp, Math.max(1, Math.round(fighter.maxHp * 0.05)));
      fighter.hp += healed;
      if (healed > 0) log.push(`你以回息恢复${healed}点气血`);
    }
  }
  return {
    result: foe.hp <= 0 ? 'win' : 'lose',
    rounds: round,
    player_hp: Math.max(0, fighter.hp),
    enemy_hp: Math.max(0, foe.hp),
    log,
  };
}

function offlineGain({ elapsedSeconds, capHours, qiPerSecond, multiplier = 1 }) {
  const elapsed = Math.max(0, Math.min(Number(elapsedSeconds) || 0, (Number(capHours) || 0) * 3600));
  return Math.floor(elapsed * Math.max(0, Number(qiPerSecond) || 0) * Math.max(0, Number(multiplier) || 0));
}

const RETREAT_MULTIPLIER = 1.75;

function breakthroughProfile({ orderIndex = 0, isMajorBreakthrough = false }) {
  const order = Math.max(0, Number(orderIndex) || 0);
  const baseChance = isMajorBreakthrough
    ? Math.max(0.48, 0.66 - order * 0.004)
    : Math.max(0.65, 0.85 - order * 0.0045);
  const lossMin = 0.06 + order * 0.001 + (isMajorBreakthrough ? 0.12 : 0);
  const lossMax = lossMin + (isMajorBreakthrough ? 0.18 : 0.12);
  return { baseChance, lossMin, lossMax };
}

function breakthroughChance({ baseChance = 0.6, itemBonus = 0, techniqueBonus = 0, failureCount = 0 }) {
  const experienceBonus = Math.min(0.12, Math.max(0, Number(failureCount) || 0) * 0.03);
  return Math.min(0.95, Math.max(0.03,
    Number(baseChance) + Math.max(0, Number(itemBonus) || 0)
      + Math.max(0, Number(techniqueBonus) || 0) + experienceBonus));
}

function breakthroughLoss({ orderIndex = 0, isMajorBreakthrough = false, random = Math.random() }) {
  const profile = breakthroughProfile({ orderIndex, isMajorBreakthrough });
  const roll = Math.min(1, Math.max(0, Number(random) || 0));
  return profile.lossMin + (profile.lossMax - profile.lossMin) * roll;
}

function retreatGain({ elapsedSeconds, capHours, qiPerSecond, multiplier = 1 }) {
  return offlineGain({
    elapsedSeconds,
    capHours,
    qiPerSecond,
    multiplier: Math.max(0, Number(multiplier) || 0) * RETREAT_MULTIPLIER,
  });
}

function encounterChance({ baseRate = 0.2, misses = 0, pityAfter = 5 }) {
  const base = Math.max(0, Math.min(1, Number(baseRate) || 0));
  const pity = Math.max(1, Math.floor(Number(pityAfter) || 1));
  const safeMisses = Math.max(0, Math.floor(Number(misses) || 0));
  if (pity === 1 || safeMisses >= pity - 1) return 1;
  return Math.min(1, base + safeMisses * ((1 - base) / (pity - 1)));
}

module.exports = {
  RETREAT_MULTIPLIER,
  battleTraits,
  combatStats,
  combatPower,
  effectiveHp,
  baseHpAfterBattle,
  resolveBattle,
  offlineGain,
  breakthroughProfile,
  breakthroughChance,
  breakthroughLoss,
  retreatGain,
  encounterChance,
};
