// Prépare le dossier www/ embarqué dans l'appli Android (Capacitor).
// Tout est copié en local : Three.js, polices et images. L'appli fonctionne sans connexion.
// Usage : node tools/build-app.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const www = path.join(root, 'www');
const nm = path.join(root, 'node_modules');
fs.rmSync(www, { recursive: true, force: true });

const copy = (from, to) => { fs.mkdirSync(path.dirname(path.join(www, to)), { recursive: true }); fs.cpSync(path.join(root, from), path.join(www, to), { recursive: true }); };

// Code du jeu et images utilisées par l'interface
copy('src', 'src');
copy('assets/renders/vehicules', 'assets/renders/vehicules');
copy('assets/renders/icones', 'assets/renders/icones');
copy('assets/icon', 'assets/icon');

// Three.js et les deux modules complémentaires utilisés
for (const f of ['build/three.module.js', 'build/three.core.js', 'examples/jsm/environments/RoomEnvironment.js', 'examples/jsm/utils/BufferGeometryUtils.js']) {
  copy(path.join('node_modules/three', f), path.join('lib/three', f));
}

// Polices embarquées (au lieu de Google Fonts)
const fonts = [
  ['Lilita One', 400, '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2'],
  ['Nunito', 700, '@fontsource/nunito/files/nunito-latin-700-normal.woff2'],
  ['Nunito', 800, '@fontsource/nunito/files/nunito-latin-800-normal.woff2'],
  ['Nunito', 900, '@fontsource/nunito/files/nunito-latin-900-normal.woff2'],
];
fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
let css = '';
for (const [family, weight, file] of fonts) {
  const name = path.basename(file);
  fs.copyFileSync(path.join(nm, file), path.join(www, 'fonts', name));
  css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(${name}) format('woff2');}\n`;
}
fs.writeFileSync(path.join(www, 'fonts', 'fonts.css'), css);

// index.html : importmap et polices en local
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '<script type="importmap">{"imports":{"three":"./lib/three/build/three.module.js","three/addons/":"./lib/three/examples/jsm/"}}</script>');
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, '');
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
if (/googleapis|jsdelivr/.test(html)) throw new Error('index.html contient encore une ressource en ligne');
fs.writeFileSync(path.join(www, 'index.html'), html);

console.log('www/ prêt');
