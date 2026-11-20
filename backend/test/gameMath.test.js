const test = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('../src/utils/gameMath');

test('offline gain respects the configured cap', () => {
  assert.equal(offlineGain({ elapsedSeconds: 20 * 3600, capHours: 8, qiPerSecond: 2, multiplier: 1.5 }), 86400);
});

test('offline gain never becomes negative', () => {
  assert.equal(offlineGain({ elapsedSeconds: -30, capHours: 8, qiPerSecond: 2 }), 0);
});

test('breakthrough chance follows documented 95% cap and failure experience', () => {
  assert.equal(breakthroughChance({ baseChance: 0.7, itemBonus: 0.3, techniqueBonus: 0.2, failureCount: 5 }), 0.95);
  assert.equal(breakthroughChance({ baseChance: 0.1, failureCount: 4 }), 0.22);
});

test('major breakthroughs are harder and more punishing', () => {
  const minor = breakthroughProfile({ orderIndex: 20, isMajorBreakthrough: false });
  const major = breakthroughProfile({ orderIndex: 20, isMajorBreakthrough: true });
  assert.ok(major.baseChance < minor.baseChance);
  assert.ok(major.lossMin > minor.lossMin);
  assert.ok(breakthroughLoss({ orderIndex: 48, isMajorBreakthrough: true, random: 1 }) < 0.41);
});

test('retreat is exclusive compensation at 1.75 times normal gain', () => {
  assert.equal(retreatGain({ elapsedSeconds: 100, capHours: 8, qiPerSecond: 2 }), 350);
});

test('encounter chance rises after safe explorations and reaches guaranteed pity', () => {
  assert.equal(encounterChance({ baseRate: 0.2, misses: 0, pityAfter: 5 }), 0.2);
  assert.ok(encounterChance({ baseRate: 0.2, misses: 2, pityAfter: 5 }) > 0.2);
  assert.equal(encounterChance({ baseRate: 0.2, misses: 4, pityAfter: 5 }), 1);
});

test('all 49 realms improve base stats without an abrupt jump at ascension', () => {
  assert.deepEqual(combatStats(0), { hp: 100, atk: 14, def: 8, spd: 12 });
  for (let order = 1; order < 49; order += 1) {
    const previous = combatStats(order - 1);
    for (const [stat, value] of Object.entries(combatStats(order))) {
      assert.ok(value > previous[stat] && value / previous[stat] <= 1.25, `${order}: ${stat}`);
    }
  }
  assert.ok(combatStats(48).hp < 4000);
});

test('all four combat stats contribute to combat power', () => {
  const baseline = combatPower({ hp: 100, atk: 10, def: 5, spd: 10 });
  assert.ok(combatPower({ hp: 200, atk: 10, def: 5, spd: 10 }) > baseline);
  assert.ok(combatPower({ hp: 100, atk: 20, def: 5, spd: 10 }) > baseline);
  assert.ok(combatPower({ hp: 100, atk: 10, def: 15, spd: 10 }) > baseline);
  assert.ok(combatPower({ hp: 100, atk: 10, def: 5, spd: 20 }) > baseline);
});

test('equipment health participates in battle without becoming permanent base health', () => {
  assert.equal(effectiveHp(100, 100, 42), 142);
  assert.equal(baseHpAfterBattle(112, 100, 42), 70);
  assert.equal(baseHpAfterBattle(1, 100, 42), 1);
  assert.equal(effectiveHp(142, 100, 0), 100);
});

test('battle resolution is deterministic with a supplied random source', () => {
  const battle = resolveBattle(
    { hp: 120, atk: 30, def: 12, spd: 20 },
    { name: '试炼木傀', hp: 60, atk: 10, def: 4, spd: 8 },
    () => 0.5,
  );
  assert.equal(battle.result, 'win');
  assert.ok(battle.rounds > 0);
  assert.ok(battle.player_hp > 0);
  assert.ok(battle.log.length > 0);
});

test('boots guarantee the opening dodge and a fan uses it for exactly one counter', () => {
  const player = { hp: 200, atk: 24, def: 8, spd: 5, traits: ['fan', 'boots', '炼体'] };
  const enemy = { name: '木傀', hp: 125, atk: 12, def: 6, spd: 10 };
  const battle = resolveBattle(player, enemy, () => 0.5);
  assert.match(battle.log[0], /踏虚/);
  assert.match(battle.log[1], /回风/);
  assert.equal(battle.log.filter(line => line.includes('回风')).length, 1);
  assert.ok(battle.log.some(line => line.includes('崩劲')));
});

test('a spear takes initiative against a faster foe only on the opening round', () => {
  const player = { hp: 200, atk: 24, def: 8, spd: 5, traits: ['spear'] };
  const enemy = { name: '木傀', hp: 125, atk: 12, def: 6, spd: 10 };
  const battle = resolveBattle(player, enemy, () => 0.5);
  assert.match(battle.log[0], /^你.*抢势/);
  assert.match(battle.log[2], /^木傀/);
});
