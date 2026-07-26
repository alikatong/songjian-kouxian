const fs = require('node:fs');
const path = require('node:path');

const realms = [
  ['mortal', 'mortal world', 'weathered iron, pale jade and warm candle-gold', 'plain but masterfully balanced'],
  ['lianpi', 'bronze skin realm', 'hammered bronze, green patina and amber qi', 'layered like tempered skin'],
  ['lianggu', 'iron bone realm', 'black iron, ivory bone inlay and cold blue qi', 'skeletal ribs and powerful joints'],
  ['yijin', 'jade sinew realm', 'white jade, teal silk and emerald qi', 'flowing tendon-like curves'],
  ['xisui', 'marrow cleansing realm', 'crystal, silver and pure cyan qi', 'translucent channels carrying light'],
  ['huanxue', 'blood renewal realm', 'dark crimson metal, black lacquer and ruby qi', 'pulsing vein motifs'],
  ['tianren', 'celestial human realm', 'moon silver, pearl and sky-gold qi', 'symmetrical celestial geometry'],
  ['lianqi', 'qi refining realm', 'spirit jade, cloud-white metal and turquoise qi', 'visible circulating energy channels'],
  ['zhujia', 'foundation establishment realm', 'dark jade, brass seals and indigo qi', 'architectural array geometry'],
  ['jindan', 'golden core realm', 'sun gold, cinnabar enamel and white-hot qi', 'a radiant core motif'],
  ['yuanying', 'nascent soul realm', 'moonstone, violet crystal and silver qi', 'ethereal doubled silhouettes'],
  ['huashen', 'spirit transformation realm', 'void-black crystal, aurora metal and prismatic qi', 'dharma-form halos'],
  ['dacheng', 'great ascension realm', 'heavenly gold, storm glass and violet lightning', 'tribulation-scarred transcendent geometry'],
];

const equipmentJobs = realms.flatMap(([key, realm, palette, motif]) => [
  {
    name: `weapon_${key}_20`, orientation: 'square', resolution: '1080p', format: 'webp', transparent: true,
    prompt: `Premium Chinese xianxia game inventory asset, one unique legendary offensive staff from the ${realm}, ${palette}, ${motif}, aggressive elongated silhouette, intricate forged details, concentrated attack aura around the staff head, full object centered and completely visible, isolated object only, no person, no hands, no scenery, no frame, no text, no symbols resembling letters, no watermark, polished 3D concept art with painterly finish, crisp readable silhouette at small UI size.`,
  },
  {
    name: `armor_${key}_09`, orientation: 'square', resolution: '1080p', format: 'webp', transparent: true,
    prompt: `Premium Chinese xianxia game inventory asset, one unique legendary protective mystical robe from the ${realm}, ${palette}, ${motif}, layered flowing fabric with defensive talisman embroidery and a subtle circular ward aura, empty garment displayed without wearer or body, full robe centered and completely visible, protective clothing not a weapon and not a shield, no person, no scenery, no frame, no text, no watermark, polished 3D concept art with painterly finish, crisp readable silhouette at small UI size.`,
  },
  {
    name: `armor_${key}_10`, orientation: 'square', resolution: '1080p', format: 'webp', transparent: true,
    prompt: `Premium Chinese xianxia game inventory asset, one unique legendary defensive ceremonial armor from the ${realm}, ${palette}, ${motif}, heavy layered cuirass and shoulder guards with a powerful protective barrier glow, empty armor displayed without wearer or body, full armor centered and completely visible, armor not a weapon and not a shield, no person, no scenery, no frame, no text, no watermark, polished 3D concept art with painterly finish, crisp readable silhouette at small UI size.`,
  },
]);

const bosses = [
  ['boss_luoxia', 'a colossal scarred mountain boar king with stone-crusted tusks', 'Luoxia village outskirts, terraced fields and sunset mountains'],
  ['boss_qingyun_foothill', 'a bronze-hide demon ape with glowing amber meridians', 'Qingyun foothill, ancient pines, steep mossy stairs and broken shrine gates'],
  ['boss_blackstone_forest', 'an obsidian bone tiger with exposed crystal ribs', 'Blackstone forest, jagged basalt trunks and cold ground mist'],
  ['boss_mist_forest', 'a giant jade-sinew horned serpent twisting through fog', 'deep mist forest, wet roots, hanging vines and dim green light'],
  ['boss_clear_spring_cliff', 'a crystalline marrow crane demon with blade-like wings', 'Clear Spring cliff, high waterfall, white rock and suspended spray'],
  ['boss_red_maple_valley', 'a blood-antler demon stag wreathed in crimson leaves', 'Red Maple valley, red forest, shallow river and storm-dark sky'],
  ['boss_mirror_lake', 'an ancient celestial dragon turtle with a mirror shell', 'Mirror Lake at night, perfectly reflected moon and shattered ice-like water'],
  ['boss_spirit_vein_valley', 'a thunder-maned spirit wolf formed from condensed qi', 'Spirit Vein valley, luminous mineral veins and turquoise energy currents'],
  ['boss_sect_outer_court', 'a towering awakened guardian lion automaton of jade and bronze', 'ruined sect outer court, vast stone stairs, banners and formation pillars'],
  ['boss_alchemy_peak', 'a nine-flame cauldron beast with molten golden core', 'Alchemy Peak, volcanic furnaces, pill halls and rivers of fire'],
  ['boss_ancient_soul_ruins', 'an ancient spectral sovereign in broken ceremonial armor', 'Ancient Soul ruins, collapsed palace, violet soul lanterns and drifting ash'],
  ['boss_law_abyss', 'a faceless colossal dharma titan covered in rotating law rings', 'Law Abyss, fractured black cliffs and floating geometric seals'],
  ['boss_heaven_gate', 'a heaven-devouring tribulation dragon armored in storm crystal', 'Heaven Gate above the clouds, shattered celestial arch and endless lightning'],
].map(([name, subject, scene]) => ({
  name, orientation: 'landscape', resolution: '4k', format: 'webp',
  prompt: `Cinematic Chinese xianxia RPG boss encounter key art, ${subject}, ${scene}. Boss fully visible and unmistakable as main subject, threatening battle-ready pose, strong foreground-midground-background depth, dramatic natural lighting, detailed environment specific to location, premium realistic fantasy concept art, readable composition behind game dialog overlays, no player character, no UI, no text, no logo, no watermark, no border, not a portrait crop, not dark or obscured.`,
}));

const root = path.resolve(__dirname, '..');
const jobsDir = path.join(root, '.art-jobs');
fs.mkdirSync(jobsDir, { recursive: true });
fs.mkdirSync(path.join(root, 'frontend/public/assets/equipment/legendary'), { recursive: true });
fs.mkdirSync(path.join(root, 'frontend/public/assets/bosses'), { recursive: true });
fs.writeFileSync(path.join(jobsDir, 'legendary-equipment.jsonl'), equipmentJobs.map((job) => JSON.stringify(job)).join('\n') + '\n');
fs.writeFileSync(path.join(jobsDir, 'bosses.jsonl'), bosses.map((job) => JSON.stringify(job)).join('\n') + '\n');
console.log(`Prepared ${equipmentJobs.length} equipment jobs and ${bosses.length} boss jobs.`);
