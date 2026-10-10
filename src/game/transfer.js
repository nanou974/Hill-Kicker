// Code de transfert : la partie est résumée en un code court à recopier sur un autre téléphone.
// Aucun serveur : le code contient lui-même la sauvegarde (niveau, monnaies, améliorations, véhicules…).
// Format : "HK" + version, puis les valeurs en entiers compactés (varint), une somme de contrôle,
// le tout en base 32 (lettres et chiffres sans I, L, O, U pour éviter les confusions), par groupes de 4.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // base 32 de Crockford
const VERSION = 1;

// CRC-16 (CCITT) : détecte une faute de frappe ou un caractère oublié
function crc16(bytes) {
  let c = 0xFFFF;
  for (const b of bytes) { c ^= b << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
  return c;
}
function pushVarint(out, n) {
  n = Math.max(0, Math.floor(n));
  do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0);
}
function readVarint(bytes, pos) {
  let n = 0, mul = 1, b;
  do { if (pos.i >= bytes.length) throw new Error('code incomplet'); b = bytes[pos.i++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
  return n;
}
function toBase32(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += ALPHABET[(val >>> (bits - 5)) & 31]; bits -= 5; } val &= (1 << bits) - 1; }
  if (bits > 0) out += ALPHABET[(val << (5 - bits)) & 31];
  return out;
}
function fromBase32(str) {
  let bits = 0, val = 0; const out = [];
  for (const ch of str) {
    const v = ALPHABET.indexOf(ch); if (v < 0) throw new Error('caractère invalide : ' + ch);
    val = (val << 5) | v; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } val &= (1 << bits) - 1;
  }
  return out;
}

// Sauvegarde -> code "HK1-XXXX-XXXX-…"
export function encodeSave(s, order) {
  const mask = (list, all) => all.reduce((m, k, i) => list.includes(k) ? m + 2 ** i : m, 0);
  const vals = [
    s.level, s.yellow, s.blue, s.gems, s.lives, s.chestCount, Math.round(s.best || 0), s.booster,
    s.up.pneus, s.up.susp, s.up.lanceur, s.up.mult,
    mask(s.cars, order), Math.max(0, order.indexOf(s.car)),
    (s.gemsTaken || []).reduce((m, id) => m | (1 << id), 0),
  ];
  const bytes = [VERSION]; for (const v of vals) pushVarint(bytes, v);
  const c = crc16(bytes); bytes.push(c >> 8, c & 255);
  return 'HK' + VERSION + '-' + toBase32(bytes).match(/.{1,4}/g).join('-');
}

// Code -> champs de sauvegarde (lève une erreur si le code est faux)
export function decodeSave(code, order) {
  // On tolère espaces, tirets, minuscules et les confusions courantes (O/0, I/L/1)
  let str = String(code).toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!str.startsWith('HK')) throw new Error('le code doit commencer par HK');
  str = str.slice(3);
  const bytes = fromBase32(str);
  if (bytes.length < 4) throw new Error('code trop court');
  // Le dernier caractère base 32 peut contenir des bits de remplissage : on cherche la longueur dont le CRC est bon
  let body = null;
  for (let n = bytes.length; n >= 3; n--) { const b = bytes.slice(0, n - 2), c = crc16(b); if (bytes[n - 2] === (c >> 8) && bytes[n - 1] === (c & 255)) { body = b; break; } }
  if (!body) throw new Error('code incorrect (vérifie chaque caractère)');
  if (body[0] !== VERSION) throw new Error('version de code inconnue');
  const pos = { i: 1 }, r = () => readVarint(body, pos);
  const level = r(), yellow = r(), blue = r(), gems = r(), lives = r(), chestCount = r(), best = r(), booster = r();
  const up = { pneus: r(), susp: r(), lanceur: r(), mult: r() };
  const carsMask = r(), carIdx = r(), gemsMask = r();
  const cars = order.filter((k, i) => Math.floor(carsMask / 2 ** i) % 2 === 1);
  if (!cars.includes('citadine')) cars.unshift('citadine');
  const gemsTaken = []; for (let i = 0; i < 16; i++) if (gemsMask & (1 << i)) gemsTaken.push(i);
  if (level < 1 || level > 1000) throw new Error('code incorrect');
  return { level, yellow, blue, gems, lives, chestCount, best, booster, up, cars, car: cars.includes(order[carIdx]) ? order[carIdx] : 'citadine', gemsTaken };
}
