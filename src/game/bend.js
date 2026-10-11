// Virages de la piste à l'écran : tout le monde 3D (terrain, décor, voiture, ombres) est décalé de côté
// dans le shader, selon le tracé du niveau (tracks.js). La physique, elle, reste en ligne droite.
// Le décalage est calculé depuis la voiture : la piste est droite sous ses roues et le virage se dessine devant,
// puis vient vers elle à mesure qu'elle avance, exactement comme si la caméra tournait avec la route.
import * as THREE from 'three';

const N = 48, STEP = 12.5, BEHIND = 60; // 48 points tous les 12,5 m, de 60 m derrière la voiture à ~530 m devant
const uniforms = {
  hkOff: { value: new Float32Array(N) },
  hkS0: { value: 0 },
  hkStep: { value: STEP },
};

const DECL = /* glsl */`
uniform float hkOff[${N}];
uniform float hkS0;
uniform float hkStep;
float hkBend(float z) {
  float d = (-z - hkS0) / hkStep;
  if (d <= 0.0) return hkOff[0];
  if (d >= ${N - 1}.0) return hkOff[${N - 1}] + (d - ${N - 1}.0) * (hkOff[${N - 1}] - hkOff[${N - 2}]);
  int i = int(floor(d));
  return mix(hkOff[i], hkOff[i + 1], d - float(i));
}
`;

const PROJECT = /* glsl */`
vec4 hkW = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  hkW = batchingMatrix * hkW;
#endif
#ifdef USE_INSTANCING
  hkW = instanceMatrix * hkW;
#endif
hkW = modelMatrix * hkW;
hkW.x += hkBend( hkW.z );
vec4 mvPosition = viewMatrix * hkW;
gl_Position = projectionMatrix * mvPosition;
`;

// Tous les matériaux (y compris ceux des ombres, créés par Three.js) passent par ce crochet avant compilation
THREE.Material.prototype.onBeforeCompile = function (shader) {
  if (!shader.vertexShader.includes('#include <project_vertex>')) return;
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', DECL + '\nvoid main() {')
    .replace('#include <project_vertex>', PROJECT)
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n  worldPosition.x += hkBend( worldPosition.z );\n#endif');
};

// Met à jour le virage vu depuis la distance sRef (m parcourus par la voiture)
export function updateBend(layout, sRef) {
  const a = uniforms.hkOff.value, s0 = sRef - BEHIND;
  uniforms.hkS0.value = s0;
  for (let i = 0; i < N; i++) a[i] = layout.curve.offsetFrom(sRef, s0 + i * STEP);
}

// Décalage appliqué à un point de la piste (pour placer un objet hors de la scène, par exemple la caméra)
export function bendAt(layout, sRef, z) { return layout.curve.offsetFrom(sRef, -z); }

// Le décalage peut faire entrer dans le champ un objet que Three.js croit hors champ : on désactive son tri
export function noCull(obj) { obj.traverse(o => { o.frustumCulled = false; }); return obj; }
