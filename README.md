# Hill Kicker

![Icône Hill Kicker](assets/icon/hill-kicker-icon-1024.jpg)

**Lance. Glisse. Améliore.** Jeu mobile en 3D low-poly (Three.js), en mode portrait.

Le joueur lance une petite voiture depuis un tapis roulant motorisé : il maintient le bouton, la jauge monte de 0 à 100 %, puis il relâche. La voiture dévale ensuite d'immenses pentes en roue libre. Seul le relief la ralentit. On ramasse des pièces et des gemmes, on enchaîne flips et tonneaux, puis on améliore la voiture pour aller toujours plus loin, jusqu'à la ligne d'arrivée.

Le document de conception complet est dans [docs/GDD.md](docs/GDD.md).

## État du projet

| Élément | État |
| --- | --- |
| Game design (GDD) | Rédigé |
| Maquettes des écrans | Faites (rendus 3D + interface) |
| Modèles 3D des 20 véhicules | Faits (`src/assets3d.js`) |
| Terrain, décors, lanceur, pièces, gemmes | Faits (`src/assets3d.js`) |
| Boucle de jeu jouable (prototype) | Faite : lanceur, course, cascades, booster, pièces, résultats, coffre, vies, améliorations, garage |
| Sons (moteur, pièces, boosts, cascades) | Faits |
| Visuels par palier d'amélioration, 20 mondes | À faire |

## Jouer

```bash
npm install
npm run serve
```

Ouvre http://localhost:8080 sur ton téléphone (même réseau) ou ton ordinateur. Sur ordinateur : souris pour le lanceur, flèches pour diriger, flèche haut pour un flip en l'air, espace pour le booster.

Pour jouer en ligne sans rien installer, active GitHub Pages sur la branche `main` (Settings › Pages) : le jeu sera alors sur https://nanou974.github.io/Hill-Kicker/.

## Structure

```
index.html              Le jeu
src/game/               Boucle de jeu : physique, monde, économie, interface, joystick
src/assets3d.js         Modèles low-poly procéduraux : 20 véhicules, terrain, arbres, lanceur, pièces, gemmes…
preview/garage.html     Visionneuse 3D interactive des 20 véhicules
tools/render/           Rendu headless des scènes et vignettes (Chromium + Three.js)
tools/sim.mjs           Simulation de calibrage (distance par lancer, progression jusqu'à l'arrivée)
tools/playtest*.mjs     Parties automatisées dans Chromium headless, avec captures
assets/icon/            Icône de l'application
assets/renders/         Rendus des scènes, des véhicules et des icônes d'amélioration
docs/GDD.md             Document de conception
```

## Lancer la visionneuse des véhicules

```bash
npm install
npm run serve
```

Ouvre ensuite http://localhost:8080/preview/garage.html. Glisse pour tourner autour du véhicule, et utilise la barre du bas pour changer de modèle.

## Régénérer les rendus

```bash
npm install
npm run render -- '[{"s":"course","file":"scenes/course.jpg"},{"s":"thumb","car":"taxi","file":"vehicules/t_taxi.png","w":360,"h":240}]'
```

Scènes disponibles : `launch`, `launch100`, `faux`, `course`, `cascade`, `results`, `home`, `hero`, `thumb`, `icon`, `appicon`. Le paramètre `car` accepte les clés de `ORDER` dans `src/assets3d.js`. Si Chromium n'est pas trouvé automatiquement, indique son chemin avec la variable `CHROME_PATH`.
