// Les 20 mondes de Hill Kicker : un thème par niveau (niveau 21 = monde 1 avec une pente plus forte, etc.).
// Chaque thème décrit le sol (piste, bas-côtés, champs), les zones spéciales de la piste (rapides / lentes),
// le ciel, la lumière, le brouillard, le relief, la gravité et les décors.
import * as A from '../assets3d.js';
import * as P from '../props.js';

// Raccourcis : f(s, r) crée un décor à l'échelle s avec le générateur r
const T = {
  tree: (s, r) => A.tree(s, Math.floor(r() * 4)), pine: (s) => A.pine(s), rock: (s) => A.rock(s), hay: (s) => A.hay(s),
  bush: (s, r) => A.bush(s, Math.floor(r() * 4)), barn: (s) => A.barn(s), windmill: (s) => A.windmill(s), cow: (s) => A.cow(s),
  ...P,
  greenBush: (s, r) => P.roundTree(s * 0.5, r, [0x3E8E37, 0x4FA548, 0x5DB04A]),
  snowPine: (s, r) => P.coneTree(s, r, [0x2F6A3E, 0x3A7A48], 0x5A4030, true),
  autumnBush: (s, r) => P.roundTree(s * 0.45, r, [0xE07B26, 0xC9471F, 0xEAB02A]),
  dryBush: (s, r) => P.roundTree(s * 0.45, r, [0xA8A050, 0x8E8A40, 0xB8A860], 0x6B5A48),
  pinkBush: (s, r) => P.roundTree(s * 0.45, r, [0xF7B6C8, 0xF49AB6]),
  sandRock: (s) => A.lump(Math.floor(s * 97) % 30 + 300, s, s * 0.6, s * 0.9, 0xD8C08A),
  redRock: (s) => A.lump(Math.floor(s * 97) % 30 + 330, s * 1.2, s * 0.9, s, 0xB8573A),
  blackRock: (s) => A.lump(Math.floor(s * 97) % 30 + 360, s, s * 0.7, s, 0x2B2727),
  moonRock: (s) => A.lump(Math.floor(s * 97) % 30 + 390, s, s * 0.6, s, 0x9A9AA0),
  blueRock: (s) => A.lump(Math.floor(s * 97) % 30 + 420, s, s * 0.7, s, 0x6E8AA8),
};

// Sol : couleurs en hexadécimal ; pattern : motif de la piste ; field : champs au-delà des talus
export const THEMES = [
  { key: 'prairie', tex: 'grass', name: 'Prairie fleurie', sky: ['#6DB8EC', '#B4E0F7', '#E4F5FF'], fog: 0xCFEAF7, hemi: [0xDDF1FF, 0x6A8A4A, 0.75], sun: [0xFFF4DE, 2.6],
    ground: { track: 0x6BB33D, trackAlt: 0x7DC24A, pattern: 'stripes', patch: 0xE0C48C, verge: 0x66B34D, field: 0x4D993D, fieldAlt: 0x5AA848 },
    fast: { name: 'goudron', color: 0x42454F }, slow: null, border: 'fence', tufts: [0x3F8F2E, 0x56A63A, 0x2F7A2E], flowers: true, cows: true,
    far: [[42, 'tree'], [24, 'pine'], [16, 'rock'], [18, 'hay']], near: [[1, 'bush']], landmark: ['barn', 'windmill'], rock: null, statue: 'statue', arch: true },
  { key: 'lavande', tex: 'gravel', name: 'Champs de lavande', sky: ['#7FB5E8', '#C6DDF2', '#F4ECF6'], fog: 0xE2DCEF, hemi: [0xF0E8FF, 0x7A6A8A, 0.8], sun: [0xFFF0DA, 2.5],
    ground: { track: 0xC9B48A, trackAlt: 0xBFA97E, pattern: 'noise', patch: 0xD8C69E, verge: 0x8AA65A, field: 0x7E6CB8, fieldAlt: 0x6E8E4A, fieldPattern: 'rows' },
    fast: { name: 'chemin dallé', color: 0xA89A86 }, slow: { name: 'terre meuble', color: 0x9A7A56 }, border: 'stonewall', tufts: [0x9B7FD4, 0x6E8E4A], flowers: false,
    far: [[40, 'lavenderRow'], [20, 'olive'], [14, 'cypress'], [6, 'beehive']], near: [[1, 'greenBush']], landmark: ['stoneHouse'], rock: 0xC9B896, statue: 'stoneLantern', arch: true },
  { key: 'automne', tex: 'leaves', name: "Forêt d'automne", sky: ['#8AAFD6', '#D8D2C2', '#F2E2C8'], fog: 0xE6D6BC, hemi: [0xFFE8C8, 0x7A5A3A, 0.8], sun: [0xFFD9A8, 2.4],
    ground: { track: 0x8E7A4A, trackAlt: 0xA0703A, pattern: 'leaves', patch: 0xC9682A, verge: 0x9A7A3A, field: 0x7A6A3A, fieldAlt: 0xB8661F },
    fast: { name: 'chemin sec', color: 0x7A6A55 }, slow: { name: 'boue', color: 0x5A4430 }, border: 'fence', tufts: [0xC9682A, 0xEAB02A, 0x8A6A2A], flowers: false,
    far: [[45, 'autumnTree'], [20, 'pine'], [10, 'mushroom'], [12, 'rock']], near: [[1, 'autumnBush']], landmark: ['mushroom'], rock: 0x8E8A80, statue: 'deadTree', arch: true },
  { key: 'plage', tex: 'sand', name: 'Plage tropicale', sky: ['#3FA9F5', '#8FD3FA', '#E8F8FF'], fog: 0xCDEFFB, hemi: [0xE8F8FF, 0xC8B080, 0.85], sun: [0xFFF6E0, 2.8], relief: 1.2, bank: 0.25,
    ground: { track: 0xEBD9A6, trackAlt: 0xE2CC92, pattern: 'dunes', patch: 0xF4E6BE, verge: 0xE8D49E, field: 0x2FA6C8, fieldAlt: 0x48C0DA, fieldPattern: 'water' },
    fast: { name: 'sable mouillé', color: 0xC9B07A }, slow: { name: 'sable mou', color: 0xF4E2B0 }, border: 'rope', tufts: [0x8EB850, 0xB8C870], flowers: false,
    far: [[40, 'palm'], [12, 'beachHut'], [16, 'parasol'], [12, 'sandRock']], near: [[1, 'palm']], landmark: ['beachHut'], rock: 0xD8C08A, statue: 'palm', arch: false },
  { key: 'savane', tex: 'dirt', name: 'Savane', sky: ['#F2B65E', '#F6D69A', '#FBEFD2'], fog: 0xF2DDB2, hemi: [0xFFF0D0, 0x9A7A40, 0.85], sun: [0xFFDDA0, 2.7],
    ground: { track: 0xB5703F, trackAlt: 0xA8653A, pattern: 'ruts', patch: 0xC48250, verge: 0xC9B060, field: 0xD8C070, fieldAlt: 0xC2A85A },
    fast: { name: 'terre battue', color: 0x8E5A34 }, slow: { name: 'herbes hautes', color: 0xD9C878 }, border: 'none', tufts: [0xD8C070, 0xB8A050], flowers: false,
    far: [[30, 'acacia'], [14, 'baobab'], [18, 'termiteMound'], [14, 'dryBush']], near: [[1, 'dryBush']], landmark: ['baobab'], rock: 0xB09070, statue: 'termiteMound', arch: false },
  { key: 'canyon', tex: 'sand', name: 'Canyons du désert', sky: ['#4A9BE0', '#A6D0F0', '#F2E0C8'], fog: 0xF0D8BC, hemi: [0xFFE8D0, 0xA8603A, 0.8], sun: [0xFFE8C8, 2.8], bank: 2.2,
    ground: { track: 0xD08A5A, trackAlt: 0xC47A4A, pattern: 'dunes', patch: 0xE0A070, verge: 0xC9683A, field: 0xB8573A, fieldAlt: 0xA8492F },
    fast: { name: 'roche lisse', color: 0x9A5038 }, slow: { name: 'sable', color: 0xE8C08A }, border: 'none', tufts: [0x9AA050, 0x7A8A40], flowers: false,
    far: [[30, 'cactus'], [14, 'mesa'], [24, 'redRock'], [10, 'tumbleweed']], near: [[1, 'cactus']], landmark: ['mesa'], rock: 0xB8573A, statue: 'cactus', arch: false,
    passage: { body: 0xC97A4A, top: 0xD89A6A } },
  { key: 'farwest', tex: 'dirt', name: 'Ville fantôme du Far West', sky: ['#D9A066', '#EBC48E', '#F8E2BC'], fog: 0xEED2A8, hemi: [0xFFE2B8, 0x8A6A40, 0.8], sun: [0xFFD8A0, 2.6],
    ground: { track: 0xB89468, trackAlt: 0xA8845A, pattern: 'ruts', patch: 0xC8A478, verge: 0xA88A5A, field: 0xC2A070, fieldAlt: 0xB09060 },
    fast: { name: 'planches', color: 0x7A5230 }, slow: { name: 'poussière', color: 0xD8BC8E }, border: 'fence', tufts: [0x9A8A50, 0xB0A060], flowers: false,
    far: [[24, 'cactus'], [12, 'saloon'], [10, 'waterTower'], [20, 'tumbleweed'], [10, 'deadTree']], near: [[1, 'tumbleweed']], landmark: ['saloon', 'waterTower'], rock: 0xA88A6A, statue: 'cactus', arch: false },
  { key: 'jungle', tex: 'mud', name: 'Jungle', sky: ['#5AA88A', '#9CCFB0', '#DDF0E2'], fog: 0xB8DCC6, fogNear: 60, fogFar: 230, hemi: [0xD8FFE0, 0x2A5A2A, 0.8], sun: [0xFFF0C8, 2.3],
    ground: { track: 0x5E7A34, trackAlt: 0x6E8A3A, pattern: 'noise', patch: 0x7A5A34, verge: 0x3E7A2E, field: 0x2A6A2A, fieldAlt: 0x357A30 },
    fast: { name: 'racines lisses', color: 0x6B5A40 }, slow: { name: 'boue', color: 0x5A4830 }, border: 'bamboo', tufts: [0x2A8034, 0x3E9A3A, 0x1F6B2A], flowers: true,
    far: [[45, 'jungleTree'], [25, 'fern'], [12, 'bamboo'], [8, 'rock']], near: [[1, 'fern']], landmark: ['jungleTree'], rock: 0x6E7A60, statue: 'stoneHead', arch: false },
  { key: 'azteque', tex: 'pavers', name: 'Temples aztèques', sky: ['#6FB8C8', '#B8DCD0', '#ECF2DC'], fog: 0xD2E4CC, hemi: [0xF0FFE8, 0x5A6A3A, 0.8], sun: [0xFFF0D0, 2.5],
    ground: { track: 0xA8A68E, trackAlt: 0x96947C, pattern: 'pavers', patch: 0x7E9A4A, verge: 0x5E8A3A, field: 0x3E7A34, fieldAlt: 0x4A8A3A },
    fast: { name: 'dalles polies', color: 0xC2C0A8 }, slow: { name: 'mousse', color: 0x5E7A3A }, border: 'rocks', tufts: [0x3E8A3A, 0x5EA040], flowers: false,
    far: [[30, 'jungleTree'], [14, 'stoneHead'], [16, 'fern'], [10, 'rock']], near: [[1, 'fern']], landmark: ['stepPyramid'], rock: 0x9C9A84, statue: 'stoneHead', arch: false,
    passage: { body: 0xA8A68E, top: 0x6E8A4A } },
  { key: 'bayou', tex: 'mud', name: 'Bayou brumeux', sky: ['#7E9A8A', '#A8BCA8', '#C8D4C0'], fog: 0xB0C0A8, fogNear: 45, fogFar: 200, hemi: [0xD8E8D0, 0x3A4A30, 0.75], sun: [0xE8F0D0, 1.9], bank: 0.25,
    ground: { track: 0x5E6A3A, trackAlt: 0x6A7444, pattern: 'noise', patch: 0x4A5A3A, verge: 0x4E6234, field: 0x34503E, fieldAlt: 0x3E5A44, fieldPattern: 'water' },
    fast: { name: 'pontons lisses', color: 0x7A6A55 }, slow: { name: 'marécage', color: 0x3A4A36 }, border: 'none', tufts: [0x6E7F3A, 0x8A9A50], flowers: false,
    far: [[40, 'cypressMoss'], [24, 'reeds'], [8, 'stiltCabin'], [10, 'deadTree']], near: [[1, 'reeds']], landmark: ['stiltCabin'], rock: 0x6A6A5A, statue: 'deadTree', arch: false },
  { key: 'japon', tex: 'gravel', name: 'Japon des cerisiers', sky: ['#9EC8F0', '#E4D8EE', '#FBEFF4'], fog: 0xF2E2EC, hemi: [0xFFF0F8, 0x7A8A6A, 0.85], sun: [0xFFF2E8, 2.5],
    ground: { track: 0xCFC6B4, trackAlt: 0xC2B8A4, pattern: 'gravel', patch: 0xF4C6D4, verge: 0x7AA45A, field: 0x6E9A54, fieldAlt: 0xE8B8C8 },
    fast: { name: 'pierres plates', color: 0x9A968E }, slow: { name: 'gravier profond', color: 0xDCD4C4 }, border: 'bamboo', tufts: [0xF7B6C8, 0x6E9A54], flowers: false,
    far: [[40, 'cherryTree'], [14, 'bamboo'], [12, 'stoneLantern'], [10, 'pine']], near: [[1, 'pinkBush']], landmark: ['pagoda', 'torii'], rock: 0x9A9A92, statue: 'stoneLantern', arch: 'torii' },
  { key: 'neon', tex: 'asphalt', name: 'Ville néon de nuit', sky: ['#0A0F2A', '#1C1F4A', '#3A2A5A'], fog: 0x1E1A3E, fogNear: 60, fogFar: 240, hemi: [0x6A6AC8, 0x1A1A2A, 0.55], sun: [0x8AA0FF, 0.9], exposure: 1.05,
    ground: { track: 0x2E3038, trackAlt: 0x34363E, pattern: 'lanes', patch: 0x3A3C46, verge: 0x8E9098, field: 0x22242C, fieldAlt: 0x2A2C34 },
    fast: { name: 'asphalte neuf', color: 0x1C1D22 }, slow: { name: 'chantier', color: 0x8A6A3A }, border: 'lamps', tufts: null, flowers: false,
    far: [[50, 'skyscraper'], [20, 'neonSign'], [10, 'container']], near: [[1, 'streetLamp']], landmark: ['skyscraper'], rock: 0x6A6E78, statue: 'trafficCone', arch: 'neon', night: true },
  { key: 'chantier', tex: 'concrete', name: 'Chantier géant', sky: ['#7FA8D0', '#C8D4DE', '#ECEEEA'], fog: 0xDADCD6, hemi: [0xEEF2F6, 0x7A6A50, 0.8], sun: [0xFFF4DE, 2.5],
    ground: { track: 0x9A8A70, trackAlt: 0xA89880, pattern: 'slabs', patch: 0x7A6A54, verge: 0x8A7A60, field: 0x9A8A6A, fieldAlt: 0x8A7A5A },
    fast: { name: 'dalle de béton', color: 0xB8B8B0 }, slow: { name: 'gravats', color: 0x6E6050 }, border: 'barrier', tufts: null, flowers: false,
    far: [[16, 'crane'], [22, 'girders'], [20, 'pipes'], [20, 'container'], [12, 'trafficCone']], near: [[1, 'trafficCone']], landmark: ['crane'], rock: 0x8E8A84, statue: 'trafficCone', arch: true },
  { key: 'banquise', tex: 'snow', name: 'Banquise', sky: ['#7EB8E8', '#C8E2F6', '#F4FAFF'], fog: 0xE2F0FA, hemi: [0xF0F8FF, 0xA8C0D8, 0.95], sun: [0xFFFFFF, 2.4],
    ground: { track: 0xF2F6FA, trackAlt: 0xE6EEF6, pattern: 'noise', patch: 0xDCE8F4, verge: 0xEAF2F8, field: 0xF4F8FC, fieldAlt: 0xDCEAF6 },
    fast: { name: 'glace', color: 0x9CCCEC }, slow: { name: 'neige poudreuse', color: 0xFFFFFF }, border: 'snowbank', tufts: null, flowers: false,
    far: [[30, 'iceberg'], [24, 'snowPine'], [10, 'igloo'], [10, 'penguin']], near: [[1, 'snowPine']], landmark: ['igloo', 'iceberg'], rock: 0xCFE6F6, statue: 'iceberg', arch: false,
    passage: { body: 0xDCEAF6, top: 0xFFFFFF } },
  { key: 'volcan', tex: 'lava', name: 'Volcan', sky: ['#3A2A2A', '#7A4A3A', '#C8784A'], fog: 0x7A4A3A, fogNear: 55, fogFar: 230, hemi: [0xFFB080, 0x2A1A1A, 0.7], sun: [0xFFA060, 2.2],
    ground: { track: 0x3A3434, trackAlt: 0x2E2A2A, pattern: 'lava', patch: 0xFF6A1F, verge: 0x2A2626, field: 0x241F1F, fieldAlt: 0x3A2A26 },
    fast: { name: 'roche vitrifiée', color: 0x1A1818 }, slow: { name: 'cendres', color: 0x6E6460 }, border: 'rocks', tufts: null, flowers: false,
    far: [[30, 'lavaRock'], [16, 'geyser'], [16, 'deadTree'], [20, 'blackRock']], near: [[1, 'blackRock']], landmark: ['volcano'], rock: 0x2B2727, statue: 'lavaRock', arch: false,
    passage: { body: 0x3A3434, top: 0x5A4A44 } },
  { key: 'marin', tex: 'sand', name: 'Fonds marins', sky: ['#0A3A6A', '#1A6A9A', '#3A9AC0'], fog: 0x1E6A94, fogNear: 40, fogFar: 190, hemi: [0x8ADCFF, 0x1A3A5A, 0.85], sun: [0xA8E8FF, 1.8],
    ground: { track: 0xCFC29A, trackAlt: 0xC2B48A, pattern: 'dunes', patch: 0xE0D4AE, verge: 0xB8A880, field: 0xA8987A, fieldAlt: 0x8A9A8A },
    fast: { name: 'courant', color: 0x7AC8D8 }, slow: { name: 'vase', color: 0x6A6450 }, border: 'none', tufts: [0x3CA36A, 0x56B87A], flowers: false,
    far: [[30, 'seaweed'], [26, 'coral'], [8, 'shipwreck'], [10, 'clam'], [10, 'blueRock']], near: [[1, 'coral']], landmark: ['shipwreck'], rock: 0x6E8AA8, statue: 'coral', arch: false, gravity: 0.8 },
  { key: 'chambre', tex: 'planks', name: "Chambre d'enfant géante", sky: ['#F6E6C8', '#FBF0DC', '#FFF8EC'], fog: 0xF6EAD4, hemi: [0xFFF6E8, 0xA88A6A, 0.9], sun: [0xFFF0DA, 2.2],
    ground: { track: 0xC48A54, trackAlt: 0xB27A48, pattern: 'planks', patch: 0x5A8AD8, verge: 0xA8743E, field: 0xB88050, fieldAlt: 0xA87040 },
    fast: { name: 'parquet ciré', color: 0xD89A60 }, slow: { name: 'tapis épais', color: 0xD85A6A }, border: 'none', tufts: null, flowers: false,
    far: [[24, 'toyBlock'], [18, 'bookStack'], [10, 'plushBear'], [14, 'toyBall'], [12, 'pencil']], near: [[1, 'toyBlock']], landmark: ['plushBear'], rock: 0xE5383B, statue: 'toyBlock', arch: true, relief: 0.6 },
  { key: 'bonbons', tex: 'candy', name: 'Monde des bonbons', sky: ['#FFB8E0', '#FFD8EE', '#FFF0F8'], fog: 0xFFE2F2, hemi: [0xFFF0FA, 0xC88AAA, 0.9], sun: [0xFFF4F8, 2.3],
    ground: { track: 0xFFE8F2, trackAlt: 0xFFD6E8, pattern: 'stripes', patch: 0xC8F0FF, verge: 0xA8E8C8, field: 0xF8C8E0, fieldAlt: 0xC8E8FF },
    fast: { name: 'sucre glace', color: 0xFFFFFF }, slow: { name: 'chocolat fondu', color: 0x6E3A1E }, border: 'candy', tufts: null, flowers: false,
    far: [[24, 'lollipop'], [18, 'candyCane'], [20, 'gumdrop'], [14, 'marshmallow'], [10, 'donut']], near: [[1, 'gumdrop']], landmark: ['lollipop'], rock: 0xFF8AC8, statue: 'gumdrop', arch: true,
    passage: { body: 0xF8B8D8, top: 0xFFFFFF } },
  { key: 'lune', tex: 'moon', name: 'Surface lunaire', sky: ['#000008', '#05051A', '#151530'], stars: true, fog: 0x101028, fogNear: 90, fogFar: 270, hemi: [0xC8C8E0, 0x2A2A30, 0.6], sun: [0xFFFFFF, 2.8],
    ground: { track: 0xA8A8AC, trackAlt: 0x9A9A9E, pattern: 'craters', patch: 0x7E7E84, verge: 0x8E8E94, field: 0x86868C, fieldAlt: 0x76767C },
    fast: { name: 'roche polie', color: 0x6E6E74 }, slow: { name: 'poussière fine', color: 0xC8C8CC }, border: 'none', tufts: null, flowers: false,
    far: [[30, 'moonRock'], [14, 'craterRim'], [6, 'lunarModule'], [8, 'dish']], near: [[1, 'moonRock']], landmark: ['lunarModule', 'dish'], rock: 0x8A8A90, statue: 'moonRock', arch: false, gravity: 0.6,
    passage: { body: 0x8A8A90, top: 0xA8A8AC } },
  { key: 'celeste', tex: 'cloud', name: 'Cité céleste', sky: ['#8EC8FF', '#D8ECFF', '#FFF4FA'], fog: 0xF0F4FF, hemi: [0xFFFFFF, 0xC8D8F0, 0.95], sun: [0xFFF8F0, 2.4],
    ground: { track: 0xF4F6FF, trackAlt: 0xE8ECFA, pattern: 'rainbow', patch: 0xFFE8F4, verge: 0xC8E8B8, field: 0xFFFFFF, fieldAlt: 0xE8F0FF },
    fast: { name: 'arc-en-ciel', color: 0xB8A8FF }, slow: { name: 'nuage mou', color: 0xFFFFFF }, border: 'none', tufts: null, flowers: false,
    far: [[30, 'cloud'], [16, 'floatingIsland'], [14, 'crystal'], [8, 'cherryTree']], near: [[1, 'cloud']], landmark: ['rainbow'], rock: 0xE8E8FF, statue: 'crystal', arch: true,
    passage: { body: 0xE8ECFA, top: 0xFFFFFF } },
];

export function themeFor(level) { return THEMES[(Math.max(1, level) - 1) % THEMES.length]; }

// Fabrique un décor par son nom
export function makeProp(name, s, r) { const f = T[name]; return f ? f(s, r) : A.rock(s); }

// Couleur du sol à un point de la grille de terrain (sRGB 0..1 dans out)
const C = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
const cache = new WeakMap();
function cols(th) {
  if (!cache.has(th)) { const g = th.ground, o = {}; for (const k of ['track', 'trackAlt', 'patch', 'verge', 'field', 'fieldAlt']) o[k] = C(g[k]); o.fast = C(th.fast.color); o.slow = th.slow ? C(th.slow.color) : o.track; cache.set(th, o); }
  return cache.get(th);
}
export function groundColor(th, x, z, half, zone, n, out) {
  const c = cols(th), g = th.ground, ax = Math.abs(x);
  const mix = (a, b, t) => { out[0] = a[0] + (b[0] - a[0]) * t + n; out[1] = a[1] + (b[1] - a[1]) * t + n; out[2] = a[2] + (b[2] - a[2]) * t + n; };
  const patchN = Math.sin(x * 0.21 + z * 0.13) + Math.sin(x * 0.09 - z * 0.27 + 2) + Math.sin(z * 0.05 + x * 0.3);
  if (zone === 'fast' || zone === 'slow') { const z0 = zone === 'fast' ? c.fast : c.slow; mix(z0, z0, 0); return out; }
  if (ax < half - 0.5) {
    // Piste
    let t = 0;
    switch (g.pattern) {
      case 'stripes': t = Math.floor(-z / 7) % 2 ? 1 : 0; break;
      case 'pavers': case 'slabs': { const cs = g.pattern === 'pavers' ? 2.5 : 5; const cx = Math.floor(x / cs), cz = Math.floor(z / cs); t = ((cx * 73856093) ^ (cz * 19349663)) & 1; if (Math.abs(x / cs - Math.round(x / cs)) < 0.06 || Math.abs(z / cs - Math.round(z / cs)) < 0.06) { mix(c.trackAlt, [0.25, 0.24, 0.22], 0.5); return out; } break; }
      case 'planks': { const px = x / 1.6; t = Math.floor(px) % 2 ? 0.6 : 0; if (Math.abs(px - Math.round(px)) < 0.05) { mix(c.trackAlt, [0.2, 0.12, 0.06], 0.7); return out; } break; }
      case 'lanes': { const lx = Math.abs(ax - 7.3) < 0.25 || ax < 0.2; if (lx && Math.floor(-z / 4) % 2 === 0) { out[0] = out[1] = out[2] = 0.92; return out; } if (Math.abs(ax - (half - 1.2)) < 0.25) { out[0] = 0.95; out[1] = 0.85; out[2] = 0.3; return out; } t = patchN > 1.2 ? 0.6 : 0; break; }
      case 'ruts': t = Math.abs(ax - 4) < 0.9 ? 1 : 0; break;
      case 'craters': { const cx = Math.round(x / 9) * 9, cz = Math.round(z / 9) * 9, d = Math.hypot(x - cx, z - cz); t = d < 2.4 ? 1 : 0; if (d < 2.4) { mix(c.patch, c.patch, 0); return out; } break; }
      case 'lava': if (Math.abs(Math.sin(x * 0.35 + z * 0.08) + Math.sin(z * 0.21 - x * 0.12)) < 0.05) { out[0] = 1; out[1] = 0.42; out[2] = 0.12; return out; } t = patchN > 1 ? 1 : 0; break;
      case 'rainbow': { const bands = [[1, 0.6, 0.6], [1, 0.82, 0.55], [1, 0.97, 0.6], [0.65, 0.95, 0.65], [0.6, 0.8, 1], [0.8, 0.65, 1]]; const b = bands[Math.max(0, Math.min(5, Math.floor((x + half) / (2 * half) * 6)))]; if (ax < half - 3) { mix(c.track, b, 0.35); return out; } break; }
      case 'leaves': t = patchN > 0.6 ? 1 : 0; break;
      case 'gravel': t = ((Math.floor(x * 1.7) * 7 + Math.floor(z * 1.7) * 13) & 3) === 0 ? 1 : 0; break;
      default: t = patchN > 0.8 ? 0.7 : 0;
    }
    if (g.pattern !== 'leaves' && patchN > 1.9) { mix(c.patch, c.patch, 0); return out; }
    if (g.pattern === 'leaves' && patchN > 1.5) { mix(c.patch, c.patch, 0); return out; }
    mix(c.track, c.trackAlt, t); return out;
  }
  if (ax < half + 2) { mix(c.verge, c.verge, 0); return out; }
  // Champs
  if (g.fieldPattern === 'rows') { const row = Math.abs((ax % 3.2) - 1.6) < 0.8; mix(row ? c.field : c.fieldAlt, c.fieldAlt, 0); return out; }
  if (g.fieldPattern === 'water') { const shore = ax < half + 9; if (shore) { mix(c.verge, c.fieldAlt, (ax - half - 2) / 7); return out; } mix(c.field, c.fieldAlt, 0.5 + 0.5 * Math.sin(x * 0.3 + z * 0.2)); return out; }
  mix(c.field, c.fieldAlt, patchN > 0.5 ? 1 : 0); return out;
}

// ---------- Texture de la piste (canvas 256 × 256, répétée tous les 6 m) ----------
// La piste reçoit une vraie texture par monde : herbe, sable ridé, terre caillouteuse, boue, pavés, gravier,
// asphalte avec marquages, béton, neige, roche volcanique, parquet, sucre, poussière lunaire, nuages.
const texCache = new Map();
export function trackTexture(th, THREE) {
  if (texCache.has(th.key)) return texCache.get(th.key);
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const hex = (h, k = 1) => { const r = ((h >> 16) & 255) * k, gg = ((h >> 8) & 255) * k, b = (h & 255) * k; return `rgb(${Math.min(255, r) | 0},${Math.min(255, gg) | 0},${Math.min(255, b) | 0})`; };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const G = th.ground, base = G.track, alt = G.trackAlt;
  const dots = (n, col, rmin, rmax) => { for (let i = 0; i < n; i++) { g.fillStyle = typeof col === 'function' ? col() : col; g.beginPath(); g.arc(rnd() * N, rnd() * N, rmin + rnd() * (rmax - rmin), 0, 7); g.fill(); } };
  g.fillStyle = hex(base); g.fillRect(0, 0, N, N);
  switch (th.tex) {
    case 'grass': g.fillStyle = hex(alt); g.fillRect(0, 0, N, N / 2); for (let i = 0; i < 900; i++) { g.strokeStyle = hex(rnd() < 0.5 ? base : alt, 0.8 + rnd() * 0.4); g.lineWidth = 1.5; const x = rnd() * N, y = rnd() * N; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 4 - rnd() * 5); g.stroke(); } break;
    case 'sand': for (let y = 0; y < N; y += 9) { g.strokeStyle = hex(alt, 0.95); g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= N; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3); g.stroke(); } dots(300, () => hex(base, 1.05 + rnd() * 0.08), 0.5, 1.2); break;
    case 'dirt': dots(500, () => hex(rnd() < 0.5 ? alt : base, 0.75 + rnd() * 0.4), 1, 3.5); for (let i = 0; i < 12; i++) { g.strokeStyle = hex(base, 0.7); g.lineWidth = 1; g.beginPath(); let x = rnd() * N, y = rnd() * N; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); } break;
    case 'mud': dots(40, () => hex(alt, 0.8 + rnd() * 0.3), 8, 22); dots(200, () => hex(base, 0.7 + rnd() * 0.5), 1, 3); break;
    case 'leaves': dots(380, () => hex([0xE07B26, 0xC9471F, 0xEAB02A, 0x8E6A2A][Math.floor(rnd() * 4)], 0.9 + rnd() * 0.2), 2, 6); break;
    case 'pavers': { const cs = 32; for (let y = 0; y < N; y += cs) for (let x = 0; x < N; x += cs) { const o = (y / cs) % 2 ? cs / 2 : 0; g.fillStyle = hex(rnd() < 0.5 ? base : alt, 0.85 + rnd() * 0.25); g.fillRect((x + o) % N + 2, y + 2, cs - 4, cs - 4); if ((x + o) % N + cs > N) g.fillRect(-N + (x + o) % N + 2, y + 2, cs - 4, cs - 4); } g.fillStyle = 'rgba(40,40,30,0.35)'; for (let y = 0; y < N; y += cs) g.fillRect(0, y, N, 2); dots(60, 'rgba(90,120,60,0.5)', 1, 3); break; }
    case 'gravel': dots(1600, () => hex(rnd() < 0.5 ? base : alt, 0.75 + rnd() * 0.45), 0.8, 2.2); break;
    case 'asphalt': dots(2500, () => hex(base, 0.7 + rnd() * 0.6), 0.4, 1); break;
    case 'concrete': { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, N, 2); g.fillRect(0, 0, 2, N); dots(400, () => hex(base, 0.85 + rnd() * 0.3), 0.5, 1.5); dots(8, 'rgba(60,50,40,0.25)', 6, 14); break; }
    case 'snow': g.fillStyle = hex(alt); for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(rnd() * N, rnd() * N, 20 + rnd() * 30, 8 + rnd() * 10, rnd() * 3, 0, 7); g.fill(); } dots(250, 'rgba(255,255,255,0.9)', 0.5, 1.2); for (let y = 0; y < N; y += 64) { g.strokeStyle = 'rgba(160,190,215,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(N * 0.3, y); g.lineTo(N * 0.32, y + 64); g.moveTo(N * 0.7, y); g.lineTo(N * 0.68, y + 64); g.stroke(); } break;
    case 'lava': dots(200, () => hex(base, 0.7 + rnd() * 0.6), 2, 6); for (let i = 0; i < 9; i++) { g.strokeStyle = 'rgb(255,110,30)'; g.lineWidth = 2; g.beginPath(); let x = rnd() * N, y = rnd() * N; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } break;
    case 'planks': for (let x = 0; x < N; x += 32) { g.fillStyle = hex(rnd() < 0.5 ? base : alt, 0.9 + rnd() * 0.2); g.fillRect(x, 0, 32, N); for (let k = 0; k < 6; k++) { g.strokeStyle = hex(base, 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(x + 4 + rnd() * 24, 0); g.bezierCurveTo(x + rnd() * 32, N / 3, x + rnd() * 32, N * 0.66, x + 4 + rnd() * 24, N); g.stroke(); } g.fillStyle = 'rgba(50,25,10,0.6)'; g.fillRect(x, 0, 2, N); g.fillRect(x, (x * 3) % N, 32, 2); } break;
    case 'candy': { const cs = 32; for (let y = 0; y < N; y += cs) for (let x = 0; x < N; x += cs) { g.fillStyle = ((x + y) / cs) % 2 ? hex(base) : hex(alt); g.fillRect(x, y, cs, cs); } dots(220, () => ['#FF5A8A', '#5AD0FF', '#FFE14D', '#7CFF8A', '#B98AFF'][Math.floor(rnd() * 5)], 1, 2.2); break; }
    case 'moon': dots(1200, () => hex(base, 0.85 + rnd() * 0.3), 0.5, 1.5); for (let i = 0; i < 10; i++) { const x = rnd() * N, y = rnd() * N, rr = 6 + rnd() * 16; g.fillStyle = hex(alt, 0.85); g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.strokeStyle = hex(base, 1.12); g.lineWidth = 2; g.beginPath(); g.arc(x - 1, y - 1, rr, 3.6, 5.8); g.stroke(); } break;
    case 'cloud': dots(70, () => `rgba(255,255,255,${0.5 + rnd() * 0.5})`, 10, 26); dots(40, 'rgba(220,226,250,0.6)', 8, 20); break;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  // Couleur moyenne : sert à teinter les zones spéciales pour qu'elles gardent leur couleur sous la texture
  const d = g.getImageData(0, 0, N, N).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 16) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length / 16;
  const lin = (v) => Math.pow(v / 255, 2.2);
  t.userData.avg = [lin(r / n), lin(gg / n), lin(b / n)];
  texCache.set(th.key, t); return t;
}
