# GDD – Hill Kicker

Version du 10 octobre 2026. Le document vivant est tenu dans Claude Docs ; ce fichier en est la copie de référence dans le dépôt.

## Concept et boucle de jeu

Hill Kicker est un jeu mobile en 3D low-poly (Three.js), en mode portrait, inspiré de Sled Surfers. Une voiture est propulsée par un lanceur façon circuits de petites voitures, dévale une piste vallonnée et doit atteindre la ligne d'arrivée pour débloquer le niveau suivant.

1. Écran d'amélioration : dépenser les monnaies, ouvrir le coffre.
2. Lancement : consomme 1 vie.
3. Course : diriger, faire des cascades, ramasser pièces et gemmes, utiliser le booster.
4. Fin de course : la voiture s'arrête, fait demi-tour, recule, ou passe la ligne d'arrivée.
5. Gains calculés, retour à l'écran d'amélioration.

## Lanceur

La voiture est posée sur un tapis motorisé. On maintient le bouton pour faire tourner les roues, on relâche pour la poser au sol et la faire partir.

- Maintien du bouton : une jauge monte de 0 à 100 %, avec le pourcentage affiché. Pas de zone rouge.
- Lâcher entre 50 et 100 % : la voiture part, avec une puissance proportionnelle au pourcentage.
- 100 % : la jauge se bloque et ne redescend pas ; tout l'écran vibre jusqu'au lâcher.
- Lâcher sous 50 % : faux départ. Les roues patinent sur le tapis, « FAUX DÉPART ! » s'affiche, la voiture ne part pas et la vie n'est pas consommée.
- Une rampe après le tapis fait décoller la voiture vers les premières pentes.

## Course

La piste est vue de derrière la voiture. Elle est large (4 à 5 voitures de front), avec des rampes et des côtes, sans aucun obstacle. Diriger sert à aller chercher pièces et gemmes, à viser les zones goudronnées et les plaques boost, et à choisir sa trajectoire dans les bosses.

**Joystick flottant**

- Un cercle apparaît là où le pouce se pose, n'importe où sur l'écran ; le point central suit le pouce.
- Au sol : gauche/droite pour diriger.
- En l'air (après une rampe) : avant = front flip, gauche/droite = barrel roll. Pas de backflip.

**Cascades**

- Possibles seulement si la distance et la vitesse permettent de terminer la rotation.
- L'atterrissage roues en bas est automatique.
- Chaque cascade réussie donne un petit boost de vitesse.

**Plaques d'accélération** : placées selon le terrain, notamment avant les grosses côtes.

**Rampes à booster** : chaque rampe porte une bande d'accélération lumineuse. La poussée est donnée dès que la voiture touche la rampe (+12 m/s, soit environ +43 km/h), avec un effet de vitesse à l'écran ; le saut qui suit est long et haut, idéal pour les cascades.

**Objets cassables** : caisses et bottes de foin posées sur la piste. Percutés, ils volent en éclats sans ralentir la voiture (la règle « seul le relief ralentit » est conservée).

**Décors du niveau 1** : arbres, sapins, rochers, buissons et clôtures en bordure, vaches, granges, moulins, fleurs, panneaux de distance tous les 250 m et arches colorées au-dessus de la piste.

**Caméra** : derrière la voiture ; dans les virages, elle glisse du côté opposé pour une vue de trois quarts, et la voiture s'oriente dans le virage.

**Ralentissement et surfaces**

- Seul le relief ralentit le véhicule : pas d'obstacle, pas de pénalité, pas de perte de vitesse à l'atterrissage.
- La surface fait varier la décélération sur le plat : terrain de base normal ; zones goudronnées (ou glace, planches lisses selon le monde) où la voiture met plus de temps à retomber à 0 km/h.

**Fin de course**

- La voiture s'arrête, fait demi-tour ou recule : fin de la course, retour à l'écran d'amélioration.
- La voiture passe la ligne d'arrivée : niveau suivant débloqué.

**Interface de course** : distance au centre en haut, barre de progression verticale à droite (drapeau, gemmes, marqueur BEST, pourcentage), compteur de vitesse en arc en bas à gauche avec le bouton booster.

## Améliorations et visuels

Quatre améliorations, achetées en monnaie jaune. Chaque palier change visiblement la voiture ou le lanceur.

| Amélioration | Effet | Visuel par palier |
| --- | --- | --- |
| Pneus | Meilleure adhérence : moins de patinage au lancement, moins de friction en course | Pneus plus larges, jantes sport, puis pneus à crampons |
| Suspensions | Absorbent les bosses : moins de vitesse perdue sur le relief accidenté | Caisse surélevée, amortisseurs apparents, puis long débattement |
| Lanceur | Vitesse de départ plus élevée à pourcentage égal | Tapis plus long, moteur plus gros, flammes ou néons |
| Multiplicateur de gains | Multiplie la distance pour calculer le gain | Peinture brillante, puis chromes, puis finitions dorées |

**Coûts par palier** (monnaie jaune) : pas de nombre de paliers fixe, on améliore autant que nécessaire pour atteindre la ligne d'arrivée. Coût du palier n = base × 1,35^(n−1), à régler pendant les essais pour qu'un niveau se termine après une trentaine d'améliorations au total. Coûts identiques à chaque niveau, puisque tout repart de zéro.

| Palier | Pneus | Suspensions | Lanceur |
| --- | --- | --- | --- |
| 1 | 100 | 100 | 150 |
| 2 | 135 | 135 | 205 |
| 3 | 180 | 180 | 275 |
| 4 | 245 | 245 | 370 |
| 5 | 330 | 330 | 500 |
| … | ×1,35 | ×1,35 | ×1,35 |

**Multiplicateur** : prix = 100 pour la première amélioration, puis 100 × 1,25 × n, où n est le nombre d'améliorations du multiplicateur déjà achetées (100, 125, 250, 375, 500…). Valeur : ×1 au départ, +0,25 par amélioration (×1,25, ×1,5, ×1,75…).

## Booster et gemmes

Le booster s'active à tout moment pendant la course avec un bouton dédié. Il n'existe pas au départ et s'achète avec des gemmes.

- Durée d'activation définie, qui augmente à chaque amélioration.
- Chaque amélioration coûte toujours 1 gemme.
- Gemmes gagnées : 1 par heure, quelques-unes ramassées sur la piste, 2 en finissant le niveau (ligne d'arrivée).

## Économie

| Ressource | Sert à | Comment l'obtenir |
| --- | --- | --- |
| Monnaie jaune | Pneus, suspensions, lanceur, multiplicateur | Fin de course : distance parcourue en mètres × multiplicateur + pièces ramassées ; coffre |
| Monnaie bleue | Acheter d'autres véhicules | 500 à chaque fin de course ; 250 dans le coffre |
| Gemmes | Booster | 1 par heure, sur la piste, 2 à l'arrivée |
| Vies | 1 vie = 1 lancement | 25 au départ et au maximum, recharge de 1 toutes les 12 min |

**Pièces sur la piste** : bronze = 1, argent = 3, or = 5, ajoutées au gain total en fin de course. À chaque ramassage, la valeur s'affiche (+1, +3, +5) avec un son propre à chaque pièce.

**Coffre** : disponible toutes les 10 min sur l'écran d'amélioration. Il contient de la monnaie jaune et 250 en monnaie bleue. Part jaune = 2 × le coût de la prochaine amélioration la moins chère, plafonnée au coût du prochain palier du multiplicateur. Premier coffre : 200 fixe (seule exception au plafond), disponible 10 min après le début du jeu.

**Vies** : affichées comme une jauge de carburant à 25 cases. À 0 vie, impossible de lancer la voiture jusqu'à la prochaine recharge.

**Fin de niveau** : quand la voiture passe la ligne d'arrivée, la monnaie jaune, les quatre améliorations et celles du booster repartent de zéro pour le niveau suivant. Les monnaies bleues, les gemmes et les véhicules achetés sont conservés.

**Début du jeu** : 0 monnaie jaune, 0 monnaie bleue, 0 gemme, aucun coffre disponible ; seulement les 25 vies et la citadine.

## Véhicules

20 véhicules, purement esthétiques : aucun bonus de vitesse ni d'amélioration. La citadine est offerte, les 19 autres coûtent de 2 000 à 50 000 en monnaie bleue (environ ×1,2 par véhicule). Clés de code entre parenthèses (`src/assets3d.js`).

| # | Véhicule | Prix (monnaie bleue) |
| --- | --- | --- |
| 1 | Citadine (`citadine`) | Offerte |
| 2 | Pick-up (`pickup`) | 2 000 |
| 3 | Break familial (`break`) | 2 500 |
| 4 | Camionnette de livraison (`camionnette`) | 3 000 |
| 5 | Taxi (`taxi`) | 3 500 |
| 6 | Buggy des sables (`buggy`) | 4 000 |
| 7 | Petite rétro années 60 (`retro`) | 5 000 |
| 8 | Camping-car (`campingcar`) | 6 000 |
| 9 | 4x4 tout-terrain (`q4x4`) | 7 000 |
| 10 | Voiture de police (`police`) | 8 500 |
| 11 | Ambulance (`ambulance`) | 10 000 |
| 12 | Muscle car (`muscle`) | 12 000 |
| 13 | Voiture de rallye (`rallye`) | 14 500 |
| 14 | Monster truck (`monster`) | 17 000 |
| 15 | Hot rod (`hotrod`) | 20 500 |
| 16 | Limousine (`limo`) | 24 500 |
| 17 | Supercar (`supercar`) | 29 000 |
| 18 | Formule 1 (`f1`) | 35 000 |
| 19 | Voiture rétro-futuriste (`retrofutur`) | 42 000 |
| 20 | Fusée sur roues (`fusee`) | 50 000 |

## Mondes

20 niveaux d'environ 3 000 m chacun (à ajuster pendant les essais), un thème unique chacun, avec une difficulté croissante. Sans amélioration, le premier lancement ne parcourt qu'environ 200 m (≈ 7 % du niveau).

| Niveau | Thème | Éléments du terrain |
| --- | --- | --- |
| 1 | Prairie fleurie | Collines douces, moulins, bottes de foin |
| 2 | Champs de lavande | Rangées violettes, mas en pierre, ruches |
| 3 | Forêt d'automne | Feuilles rousses, troncs couchés, champignons géants |
| 4 | Plage tropicale | Dunes, palmiers, pontons en bois |
| 5 | Savane | Termitières, acacias, points d'eau |
| 6 | Canyons du désert | Arches rocheuses, cactus, ponts suspendus |
| 7 | Ville fantôme du Far West | Saloon, rails abandonnés, buissons roulants |
| 8 | Jungle | Lianes, cascades, ponts de corde |
| 9 | Temples aztèques | Pyramides à marches, statues, passages secrets |
| 10 | Bayou brumeux | Pontons lisses, cyprès, racines en bosses |
| 11 | Japon des cerisiers | Torii, pétales, toits de pagodes |
| 12 | Ville néon de nuit | Toits d'immeubles, enseignes, échafaudages |
| 13 | Chantier géant | Grues, poutrelles, tuyaux |
| 14 | Banquise | Icebergs, plaques de glace, igloos |
| 15 | Volcan | Coulées de lave, roches noires, geysers |
| 16 | Fonds marins | Tunnel de verre, coraux, épaves |
| 17 | Chambre d'enfant géante | Livres en rampes, blocs de construction, peluches |
| 18 | Monde des bonbons | Collines de guimauve, sucres d'orge, chocolat fondu |
| 19 | Surface lunaire | Cratères, faible gravité, module lunaire |
| 20 | Cité céleste | Îles flottantes, nuages rebondissants, arc-en-ciel |

## Son

Sons synthétisés en direct (Web Audio, aucun fichier) : ronronnement léger du moteur qui suit la vitesse et la jauge du lanceur, son de pièce plus aigu et plus brillant selon sa valeur, gemme, boost, décollage, atterrissage, cascade, faux départ, achat, coffre et fin de niveau. Le son se coupe dans les options.

## Technique

Jeu web en Three.js pour mobile, affichage en mode portrait uniquement. Physique des véhicules via une librairie dédiée (cannon-es ou Rapier) ou un modèle simplifié maison. Les modèles 3D procéduraux (véhicules, terrain, décors, lanceur, pièces, gemmes) sont dans `src/assets3d.js`.
