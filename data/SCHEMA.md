# Schémas des données du Carnet de biologie

Tout le contenu du site est dans `data/`, en JSON (UTF-8, indentation libre).
**Règle d’or : un fichier = un élément**, et l’`id` (ou la `date` pour une session) est **égal au nom du fichier sans `.json`**.
Les identifiants sont en minuscules, chiffres et tirets (`vulpes-vulpes`, `effet-allee`).

Après toute modification : `python3 build.py`. Le script vérifie tout (ids, liens, doublons, valeurs permises) et n’écrit `data/bundle.js` que si **zéro erreur**. Ne jamais éditer `bundle.js` à la main.

Champs marqués `?` = facultatifs. Les textes longs acceptent : ligne vide = nouveau paragraphe, `**gras**`, `*italique*`. Pas de HTML.
Convention express/approfondi : `essentiel` (3–5 phrases, toujours affiché) / `details` (masqué en mode Express sur la page du jour).

---

## `modules.json` (fichier unique, rarement modifié)
```json
[{ "id": "module2", "nom": "M2 · Génétique des populations", "dossier": "module 2/", "fichiers": ["Résumé module 2.docx"] }]
```
Identifiants de modules valides : `zoologie`, `botanique`, `ethologie`, `societes`, `module1`, `module2`, `module3`, `module4`, `module5`, `transcriptomique`, `ecologie`.

## Notion — `notions/<id>.json`
Même format pour `ecologie/concepts/<id>.json` et `comportement/<id>.json`. **Les ids doivent être uniques entre ces trois dossiers.**
```json
{
  "id": "fst-nm",
  "titre": "F_ST et nombre de migrants (Nm)",
  "module": "module2",
  "source": "module 2/CoursBIOL-F450_SM2(OH3)StructGenet.pdf",
  "categorie?": "botanique-base",
  "essentiel": "…", "details": "…",
  "question": "Question ouverte…",
  "reponse": "Réponse modèle…",
  "pieges": ["Piège courant 1", "…"],
  "a_revoir?": { "erreur": "Mon erreur typique" },
  "liens?": ["autre-notion-id"],
  "especes?": ["id-animal-ou-plante"],
  "exemples?": [{ "espece": "id-espece", "texte": "…" }, { "espece_libre": "Nom (si pas de fiche)", "texte": "…" }]
}
```
- `source` : chemin relatif au dossier « Biologie connaissances » ; pour l’écologie hors cours : `"Hors cours — synthèse de référence (écologie générale)"`.
- `categorie: "botanique-base"` → apparaît dans *Plantes › Botanique de base* (notions du volume 1).
- `comportement/` = rubrique *Comportement décrypté* (ids préfixés `cd-`), avec `exemples` (plusieurs espèces).

## Animal — `animaux/<id>.json` (id = nom latin en kebab-case)
```json
{
  "id": "vulpes-vulpes", "nom": "Renard roux", "latin": "Vulpes vulpes",
  "groupe": "mammifere",
  "milieu": ["foret", "prairie", "urbain"],
  "belgique": true,
  "clade": "carnivora",
  "resume": "2–3 lignes pour la page du jour",
  "phylogenie": [{ "rang": "Embranchement", "nom": "Chordés", "synapomorphies": ["Notochorde", "…"] }, "… classe, ordre, famille, genre"],
  "mini_arbre": { "externe": "Felis silvestris", "parents": ["Vulpes lagopus", "Nyctereutes procyonoides", "Canis lupus"] },
  "caracteristiques": { "essentiel": "…", "details": "…" },
  "comportement": { "essentiel": "…", "details": "…", "concepts": ["id-notion-ou-cd"] },
  "ecologie": { "essentiel": "…", "details": "…", "uicn": "LC", "menaces": ["…"] },
  "facts": ["3 à 5 faits vérifiés"],
  "anecdote": "Une phrase à ressortir en conversation.",
  "indices_quiz": ["indice phylogénie", "indice comportement", "indice fact"],
  "terrain?": { "ou": "…", "quand": "…", "criteres": ["…"], "sosies": [{ "espece": "Nom (latin)", "distinguer": "…" }] },
  "liens": { "inaturalist": "https://www.inaturalist.org/taxa/<NUMÉRO>", "commons": "https://commons.wikimedia.org/wiki/Category:Genre_espece" },
  "notions": ["id-notion"],
  "sources?": [{ "nom": "…", "url": "…" }],
  "ajoute_le": "AAAA-MM-JJ"
}
```
- `groupe` (valeurs utilisées) : `mammifere, oiseau, amphibien, poisson, insecte, crustace, arachnide, mollusque, annelide, cnidaire, echinoderme, eponge, tardigrade, nematode, agnathe, cephalochorde, urochorde` (on peut en ajouter).
- `milieu` : mots libres en minuscules (`foret, prairie, jardin, urbain, mare, riviere, mer, savane, desert, lande, tourbiere, haie, culture, friche, souterrain, broussailles, zone-humide, lac, sol, arbre, falaise`).
- `clade` : **id d’un nœud existant** de `arbres/animal.json` (le plus précis possible).
- `mini_arbre.parents` : du **plus proche au plus éloigné** ; le site dessine `(externe, (parentN, … (parent1, espèce)))`. `externe` = juste le nom (le site ajoute « (externe) »).
- `uicn` : `EX, EW, CR, EN, VU, NT, LC, DD, NE` (statut mondial).
- `terrain` : pour les espèces de Belgique ; `sosies` alimente le jeu « Sosies ».
- `liens.inaturalist` : **vrai numéro de taxon**, à vérifier via `https://api.inaturalist.org/v1/taxa?q=Genre%20espece&rank=species`.

## Plante / champignon / algue — `plantes/<id>.json`
Comme un animal, sauf :
```json
{
  "type": "arbre|arbuste|fleur|liane|assiette|mousse|fougere|champignon|lichen|algue",
  "regne": "plante|champignon|algue",
  "saison": [9, 10, 11],
  "anatomie": { "essentiel": "…", "details": "…" },
  "identification": { "feuille": "…", "fleur": "…", "fruit": "…", "ecorce": "…", "port": "…", "periode": "…" },
  "usages": { "essentiel": "…", "details": "…", "cueillette?": "…", "confusions_dangereuses?": ["…"] }
}
```
- Pas de `groupe` ni de `comportement`/`caracteristiques`. `clade` = id de `arbres/vegetal.json`.
- `saison` = mois (1–12) où elle est la plus visible (filtre « Visible ce mois-ci »).
- `identification` : clés libres (pour un champignon : `chapeau, lames, pied, chair, habitat, periode`).

## Arbres — `arbres/animal.json`, `arbres/vegetal.json`
```json
{ "id": "chordata", "nom": "Chordés", "synapomorphies": ["…"], "texte": "…", "source": "Zoologie/…pdf",
  "enfants": [ { "id": "…", "nom": "…", "enfants": [] } ] }
```
Ajouter un clade = insérer un nœud avec un `id` unique (dans les deux arbres réunis). Les fiches s’y rattachent par `clade`.

## Actu — `actus/AAAA-MM-JJ-mot-cle.json`
```json
{
  "id": "2026-10-22-bonobos-femelles-chasse", "date": "2026-10-22",
  "titre": "…", "resume": "3–4 lignes",
  "source": { "nom": "Revue — auteurs (institution)", "url": "https://…" },
  "source_presse?": { "nom": "…", "url": "…" },
  "themes": ["zoologie", "comportement"],
  "module?": "ethologie",
  "grille": { "modele": "animal", "echantillon": "415 captures, 10 ans", "publication": "revue", "design": "correlation", "ecart_titre": "faible", "grand_echantillon?": true },
  "quiz": { "question": "…", "choix": ["A", "B", "C"], "bonne": 1 }
}
```
- `themes` (libres, conseillés) : `zoologie, botanique, comportement, ecologie, biodiversite, conservation, evolution, genetique, neurosciences, sante, paleontologie, climat`.
- `grille.modele` : `humain | animal | plante | in vitro | modelisation | terrain` ; `publication` : `revue | preprint` ; `design` : `correlation | causalite` ; `ecart_titre` : `faible | moyen | fort`.
- **Le badge de fiabilité est calculé par le site** (ne pas l’écrire) :
  - 🔴 pincettes : preprint, OU écart fort, OU modèle in vitro / modélisation ;
  - 🟢 solide : revue ET écart faible ET (causalité OU `grand_echantillon: true`) ;
  - 🟡 prometteur : tout le reste.
- `quiz.bonne` = index (0, 1, 2…) de la bonne réponse dans `choix`.

## Décryptage — `decryptages/AAAA-MM-JJ.json` (date du lundi)
```json
{ "id": "2026-11-02", "actu": "<id d’actu existante>", "titre": "…",
  "question": "…", "methode": "…", "resultats": "…", "limites": "…", "ce_que_ca_change": "…",
  "lien_cours": { "module": "module5", "notions": ["id-notion"], "texte": "…" } }
```

## Écosystème — `ecologie/ecosystemes/AAAA-MM-JJ-nom.json` (date du lundi)
```json
{ "id": "2026-11-02-foret-de-soignes", "semaine": "2026-11-02", "nom": "Forêt de Soignes", "lieu": "…",
  "fonctionnement": { "essentiel": "…", "details": "…" },
  "especes_cles": ["id-espece-ou-nom-libre"], "especes_texte?": "…",
  "menaces": ["…"], "a_observer": "…", "notions?": ["id-notion"] }
```

## `ecologie/calendrier.json` (12 entrées)
```json
[{ "mois": 11, "evenements": [{ "type": "oiseaux|flore|champignons|mammiferes|insectes|amphibiens|poissons|mer", "texte": "…", "especes?": ["id"] }] }]
```

## `ecologie/biodiversite.json`
```json
[{ "titre": "…", "chiffre": "−56 % (1980–2017)", "tendance": "hausse|baisse|stable", "texte": "…", "source": { "nom": "…", "url": "…" }, "maj": "AAAA-MM-JJ" }]
```
Mettre à jour un élément existant (et `maj`) plutôt qu’en dupliquer.

## Session du jour — `sessions/AAAA-MM-JJ.json`
```json
{
  "date": "2026-11-02",
  "revision": "regle-hamilton",
  "bonus": { "titre": "…", "essentiel": "…", "details": "…", "lien_notion?": "id-notion" },
  "animal": "aegithalos-caudatus", "animaux_reserve": ["id", "id", "id"],
  "plante": "primula-vulgaris", "plantes_reserve": ["id", "id"],
  "digest": ["id-actu", "id-actu", "id-actu"],
  "quiz": [
    { "type": "notion", "ref": "regle-hamilton" },
    { "type": "leitner" },
    { "type": "identifier", "ref": "id-animal-ou-plante" },
    { "type": "actu", "ref": "<actu d’il y a ~3 jours>" },
    { "type": "actu", "ref": "<actu d’il y a ~7 jours>" }
  ]
}
```
`leitner` : le site pioche une fiche due de l’utilisateur (ou une notion jamais vue).

---

## Progression (navigateur, pas dans `data/`)
`localStorage["carnet-progress"]` (préférences : `localStorage["carnet-prefs"] = {"mode": "express|approfondi"}`) :
```json
{ "version": 1,
  "jours": ["2026-11-01", "2026-11-02"],
  "lus": { "animaux": { "vulpes-vulpes": "2026-11-02" }, "plantes": {}, "notions": {} },
  "leitner": { "notion:fst-nm": { "boite": 1, "prochaine": "2026-11-03", "erreur": "…", "rates": 1 } },
  "quiz": [{ "date": "2026-11-02", "ref": "notion:fst-nm", "resultat": "savais|hesitant|rate" }],
  "reponses": { "2026-11-02": { "revision": "texte tapé" } } }
```
Cartes Leitner : `notion:<id>`, `actu:<id>`, `animal:<id>`, `plante:<id>`, `sosie:<animaux|plantes>:<id>:<index>`.
Boîtes 1→5, retour après 1, 2, 4, 8, 16 jours ; « Je savais » +1 boîte, « Hésitant » = même boîte, « Raté » → boîte 1.
