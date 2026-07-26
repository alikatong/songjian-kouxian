const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ascensionMultiplierForRarity,
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
  assert.equal(breakthroughLoss({ orderIndex: 48, isMajorBreakthrough: true, random: 1 }), 0.99);
});

test('retreat is exclusive compensation at 1.75 times normal gain', () => {
  assert.equal(retreatGain({ elapsedSeconds: 100, capHours: 8, qiPerSecond: 2 }), 350);
});

test('encounter chance rises after safe explorations and reaches guaranteed pity', () => {
  assert.equal(encounterChance({ baseRate: 0.2, misses: 0, pityAfter: 5 }), 0.2);
  assert.ok(encounterChance({ baseRate: 0.2, misses: 2, pityAfter: 5 }) > 0.2);
  assert.equal(encounterChance({ baseRate: 0.2, misses: 4, pityAfter: 5 }), 1);
});

test('combat stats scale deterministically with realm order', () => {
  assert.deepEqual(combatStats(4), { hp: 340, atk: 46, def: 21, spd: 18 });
});

test('major ascension multiplier follows active technique rarity', () => {
  assert.equal(ascensionMultiplierForRarity('common'), 3);
  assert.equal(ascensionMultiplierForRarity('uncommon'), 3.05);
  assert.equal(ascensionMultiplierForRarity('rare'), 3.1);
  assert.equal(ascensionMultiplierForRarity('epic'), 3.15);
  assert.equal(ascensionMultiplierForRarity('legendary'), 3.2);
  assert.equal(ascensionMultiplierForRarity('unknown'), 3);
});

test('major ascension multiplier compounds into all base combat stats', () => {
  const firstAscension = combatStats(1, 3.2);
  const secondAscension = combatStats(5, 3.2 * 3.15);
  assert.deepEqual(firstAscension, { hp: 512, atk: 61, def: 29, spd: 38 });
  assert.deepEqual(secondAscension, { hp: 4032, atk: 554, def: 252, spd: 202 });
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
