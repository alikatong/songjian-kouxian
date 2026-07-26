const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeCharacter } = require('../src/services/gameService');

function characterRow(overrides = {}) {
  return {
    id: 1,
    name: '测试修士',
    current_qi: '0',
    qi_required: '100',
    qi_per_second: '1',
    technique_stat_bonuses: { hp: 2 },
    technique_rarity: 'common',
    technique_qi_multiplier: 1,
    retreat_technique_multiplier: 1,
    order_index: 0,
    breakthrough_failures: 0,
    major_stat_multiplier: 1,
    offline_qi_cap_hrs: 8,
    stamina: 100,
    stamina_updated_at: new Date(),
    hp: 90,
    hp_max: '100',
    atk: '10',
    def: '5',
    spd: '10',
    spirit_stones: '0',
    fate_points: 0,
    attack_weapon_code: 'test_weapon',
    attack_weapon_name: '测试剑',
    attack_weapon_rarity: 'common',
    attack_weapon_hp: '10',
    attack_weapon_attack: '0',
    attack_weapon_defense: '0',
    attack_weapon_speed: '0',
    defense_weapon_code: 'test_armor',
    defense_weapon_name: '测试甲',
    defense_weapon_rarity: 'common',
    defense_weapon_hp: '20',
    defense_weapon_attack: '0',
    defense_weapon_defense: '0',
    defense_weapon_speed: '0',
    ...overrides,
  };
}

test('serialized health includes active bonuses and clamps legacy overflow', () => {
  const injured = serializeCharacter(characterRow());
  assert.equal(injured.stats.hp, 122);
  assert.equal(injured.stats.hp_max, 132);
  assert.equal(injured.stats.atk, 10);
  assert.equal(injured.stats.def, 5);
  assert.equal(injured.stats.spd, 10);

  const overflowed = serializeCharacter(characterRow({ hp: 145 }));
  assert.equal(overflowed.stats.hp, 132);
});
