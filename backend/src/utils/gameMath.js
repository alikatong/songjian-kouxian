function combatStats(orderIndex, majorStatMultiplier = 1) {
  const order = Math.max(0, Number(orderIndex) || 0);
  const multiplier = Math.max(1, Number(majorStatMultiplier) || 1);
  return {
    hp: Math.round((100 + order * 60) * multiplier),
    atk: Math.round((10 + order * 9) * multiplier),
    def: Math.round((5 + order * 4) * multiplier),
    spd: Math.round((10 + order * 2) * multiplier),
  };
}

function ascensionMultiplierForRarity(rarity = 'common') {
  return { common: 3, uncommon: 3.05, rare: 3.1, epic: 3.15, legendary: 3.2 }[rarity] || 3;
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

function scaleTechniqueStats(stats = {}, rarity = 'common') {
  const multiplier = { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12 }[rarity] || 1;
  return Object.fromEntries(Object.entries(stats || {}).map(([key, value]) => [
    key, Math.round(Number(value) * multiplier),
  ]));
}

function resolveBattle(player, enemy, random = Math.random) {
  const fighter = { ...player, hp: Math.max(1, Number(player.hp) || 1) };
  const foe = { ...enemy, hp: Math.max(1, Number(enemy.hp) || 1) };
  const log = [];
  let round = 0;
  const playerFirst = Number(fighter.spd) >= Number(foe.spd);

  const strike = (attacker, defender, attackerName, defenderName) => {
    const speedEdge = (Number(attacker.spd) - Number(defender.spd)) / Math.max(1, Number(defender.spd));
    const dodgeChance = Math.max(0.02, Math.min(0.25, 0.05 - speedEdge * 0.12));
    if (random() < dodgeChance) {
      log.push(`${defenderName}避开了${attackerName}的攻势`);
      return;
    }
    const critChance = Math.max(0.05, Math.min(0.25, 0.05 + Math.max(0, speedEdge) * 0.15));
    const critical = random() < critChance;
    const variance = 0.9 + random() * 0.2;
    const raw = Number(attacker.atk) * variance - Number(defender.def) * 0.55;
    const damage = Math.max(1, Math.round(raw * (critical ? 1.6 : 1)));
    defender.hp = Math.max(0, defender.hp - damage);
    log.push(`${attackerName}${critical ? '觅得破绽，重创' : '击中'}${defenderName}，造成${damage}点伤害`);
  };

  while (fighter.hp > 0 && foe.hp > 0 && round < 30) {
    round += 1;
    if (playerFirst) {
      strike(fighter, foe, '你', enemy.name);
      if (foe.hp > 0) strike(foe, fighter, enemy.name, '你');
    } else {
      strike(foe, fighter, enemy.name, '你');
      if (fighter.hp > 0) strike(fighter, foe, '你', enemy.name);
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
    ? Math.max(0.06, 0.16 - order * 0.0022)
    : Math.max(0.12, 0.34 - order * 0.0045);
  const lossMin = Math.min(0.84, 0.05 + order * 0.007 + (isMajorBreakthrough ? 0.15 : 0));
  const lossMax = Math.min(0.99, lossMin + 0.3 + order * 0.008);
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
  ascensionMultiplierForRarity,
  combatStats,
  combatPower,
  effectiveHp,
  baseHpAfterBattle,
  scaleTechniqueStats,
  resolveBattle,
  offlineGain,
  breakthroughProfile,
  breakthroughChance,
  breakthroughLoss,
  retreatGain,
  encounterChance,
};
