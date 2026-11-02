# Instructions de l’agent quotidien — Carnet de biologie

Tu es l’agent qui enrichit chaque matin le site **Carnet de biologie** d’Othmane, biologiste (master ULB) qui ne travaille plus en biologie et veut entretenir et approfondir ses connaissances. Tu n’as **aucun accès** à la conversation qui a créé le site : ce fichier contient tout ce qu’il te faut.

- Dépôt : `~/carnet-biologie` (site statique ; tout le contenu est en JSON dans `data/`).
- Formats exacts : **`data/SCHEMA.md` (à lire en entier avant d’écrire quoi que ce soit)**.
- Cours d’Othmane (PDF/DOCX) : `~/Desktop/Biologie connaissances/` (modules : `Zoologie/`, `Botanique/`, `comportement animal/`, `animal societies/`, `module 1/` à `module 5/`, `Transcriptomic/`). Extraction : `pdfplumber` (PDF) et `python-docx` (DOCX) ; les syllabus sont longs → lis par sections (cherche d’abord avec `grep` dans le texte extrait).
- Langue : **français**, niveau biologiste (pas de vulgarisation simpliste, mais clair).
- **Tu ne modifies jamais le code** (`index.html`, `css/`, `js/`, `build.py`). Tu écris uniquement des fichiers JSON dans `data/`.

## Règles absolues
1. **N’invente rien** : ni espèce, ni chiffre, ni citation, ni actu, ni DOI, ni numéro iNaturalist. Un point incertain → tu l’omets.
2. Chaque actu provient d’une **vraie source consultée aujourd’hui** (recherche web + lecture de la page). Pas d’actu sans URL vérifiée.
3. Pas de doublon : une espèce (nom latin) n’existe qu’une fois ; ne réutilise pas un id existant.
4. Aucune image copiée, aucune clé d’API.
5. Si `python3 build.py` signale une erreur, **corrige le JSON** jusqu’à zéro erreur. Ne publie jamais un état cassé.

## Déroulé, chaque matin

### 0. Faire le point (2 min)
```bash
cd ~/carnet-biologie && git pull --rebase && python3 etat.py
```
`etat.py` affiche : date et jour, si la session du jour existe déjà, les modules révisés les 7 derniers jours, les notions déjà utilisées, les espèces existantes, les clades terminaux sans fiche, les plantes de saison et les dernières actus. **Si la session du jour existe déjà, arrête-toi.**

### 1. Notion de révision du jour
- Choisis un **module différent** de ceux des 3 dernières sessions (voir `etat.py`) ; fais tourner sur les 11 modules dans le temps.
- Prends de préférence une **notion existante** jamais utilisée en révision (`notions/`, `comportement/`, `ecologie/concepts/`). Si le module en manque, **crée une nouvelle fiche de notion** à partir des cours (lis le fichier source ; renseigne `source` avec le chemin exact relatif au dossier des cours). Une nouvelle notion = question ouverte + réponse modèle + 2–3 pièges.
- Ne crée jamais de champ `a_revoir` : il est réservé aux erreurs signalées par Othmane.

### 2. Concept bonus
Un concept **lié** à la notion du jour qui **va plus loin** (recherche récente, débat, application, autre groupe taxonomique). `essentiel` 3–5 phrases, `details` 1–2 paragraphes, `lien_notion` vers la notion du jour ou une notion proche. Il vit dans la session (pas de fichier séparé).

### 3. Animal du jour + 3 animaux de réserve ; plante du jour + 2 plantes de réserve
Tu crées **4 nouvelles fiches animaux** (`data/animaux/`) et **3 nouvelles fiches plantes** (`data/plantes/`), complètes selon `SCHEMA.md`.
- **Aucun doublon** avec la liste d’`etat.py` (compare les noms latins).
- **Varier les branches** : au moins une des 4 fiches animales dans un clade terminal **sans fiche** ou peu fourni (voir `etat.py`) ; jamais deux fois le même ordre le même jour ; alterner vertébrés et invertébrés d’un jour à l’autre. Pour les plantes, alterner arbres / fleurs sauvages / plantes de l’assiette / mousses-fougères / champignons-lichens-algues.
- **Saison et Belgique** : la fiche du jour (animal et plante) est de préférence une **espèce présente en Belgique et observable ce mois-ci** (migrations, floraisons, champignons…). Environ la moitié des animaux de réserve peuvent être des espèces remarquables du monde.
- **Phylogénie** : de l’embranchement (ou de la division) au genre, avec pour chaque nœud ses synapomorphies, en t’appuyant sur les cours (`Zoologie/Synthese sur tout le syllabus de zoologie de M. Flot.pdf`, `Zoologie/Synthese de Zoologie 2 2019-2020.pdf`, syllabus de botanique vol. 2 et 3) et sur la classification APG pour les angiospermes.
- `clade` = id **existant** dans `data/arbres/animal.json` ou `vegetal.json`. Si un clade nécessaire manque vraiment, tu peux **ajouter un nœud** (id unique, `nom`, `synapomorphies`, `texte`, `source`) au bon endroit de l’arbre — sans rien supprimer.
- `mini_arbre.parents` du plus proche au plus éloigné ; `externe` = nom seul.
- **Comportement** (animaux) : relie explicitement aux concepts des cours d’éthologie et de sociétés animales quand c’est pertinent, via `comportement.concepts` (ids existants : par ex. `signal-honnete`, `exploitation-sensorielle`, `regle-hamilton`, `eusocialite-criteres`, `bateman-selection-sexuelle`, `cd-altruisme-parentele`…).
- **Plantes** : identification (feuille, fleur, fruit, écorce, port, période), usages et cuisine, **confusions dangereuses** obligatoires si l’espèce est cueillie ou ressemble à une espèce toxique.
- 3 à 5 `facts` vérifiés, une `anecdote` d’une phrase, 3 `indices_quiz` (phylogénie → comportement → fact), `terrain` avec `sosies` pour les espèces de Belgique.
- **Liens** : vérifie le numéro iNaturalist, au rang espèce :
  ```bash
  curl -s "https://api.inaturalist.org/v1/taxa?q=Genre%20espece&rank=species" | python3 -c "import json,sys; print([(t['id'],t['name']) for t in json.load(sys.stdin)['results'][:3]])"
  ```
  Commons : `https://commons.wikimedia.org/wiki/Category:Genre_espece`.
- `ajoute_le` = date du jour.

### 4. Actus (digest de 3 à 5)
1. Cherche sur le web des études **publiées ou relayées dans les 7 derniers jours** : zoologie, botanique, comportement, écologie/biodiversité, évolution, génétique, neurosciences, paléontologie, santé (en lien avec la biologie). Sources à privilégier : communiqués d’universités/instituts (MPI, CNRS, INRAE…), EurekAlert, ScienceDaily, Phys.org, Nature/Science news, The Conversation, Botany One, presse belge (Le Soir, RTBF, La Libre) pour la Belgique. Varie les thèmes.
2. **Lis la page** (et si possible le résumé de l’article) pour relever : revue ou preprint, DOI, modèle étudié, taille d’échantillon, design (expérience contrôlée = `causalite`, observation/comparaison/méta-analyse = `correlation`), limites citées.
3. Applique la **grille d’esprit critique** (`grille` dans `SCHEMA.md`) honnêtement. `ecart_titre` compare le titre de presse au résultat réel (« guérit », « prouve », « comme les humains » sur un petit résultat → `fort`). Mets `grand_echantillon: true` seulement si l’échantillon est réellement grand (centaines d’individus, milliers de points, dizaines de génomes…). **N’écris pas le badge** : le site le calcule.
4. Résumé 3–4 lignes, factuel, avec les chiffres clés et une limite. `module` = module de cours concerné s’il y en a un.
5. Un `quiz` QCM à 3 choix par actu (réponse non ambiguë, tirée du résumé).
6. Fichier : `data/actus/AAAA-MM-JJ-mot-cle.json` (date = date de publication/relais).

### 5. Quiz du jour (dans la session)
Toujours 5 entrées, dans cet ordre :
1. `{"type":"notion","ref":"<notion du jour>"}`
2. `{"type":"leitner"}`
3. `{"type":"identifier","ref":"<un animal ou une plante existant, pas celui du jour>"}`
4. `{"type":"actu","ref":"<actu datée d’environ 3 jours avant aujourd’hui (la plus récente ≤ J-3)>"}`
5. `{"type":"actu","ref":"<actu datée d’environ 7 jours avant (la plus récente ≤ J-7)>"}`

### 6. Le lundi seulement
- **Décryptage de la semaine** : `data/decryptages/AAAA-MM-JJ.json` (date du lundi). Choisis l’étude la plus solide/instructive des 7 derniers jours (une actu existante). Explique à fond : question, méthode, résultats (chiffres), limites, ce que ça change, lien avec les cours (`lien_cours` avec module + notions existantes + texte).
- **Écosystème de la semaine** : `data/ecologie/ecosystemes/AAAA-MM-JJ-nom.json`. Alterne milieux belges (forêt de Soignes, Hautes Fagnes, dunes, mare, prairie de fauche, Campine, vallée de la Semois, Zwin, terrils, ville…) et du monde (récif corallien, mangrove, toundra, savane, forêt tropicale, grand fond…), sans répéter les 8 derniers. `especes_cles` : ids de fiches existantes quand possible, sinon noms libres. `a_observer` adapté à la saison.
- Mets à jour **`data/ecologie/biodiversite.json`** si une actu de la semaine apporte un chiffre clé (modifier l’élément existant et sa date `maj`, ou en ajouter un, avec source).

### 7. Créer la session
`data/sessions/AAAA-MM-JJ.json` selon `SCHEMA.md` : `revision`, `bonus`, `animal`, `animaux_reserve` (les 3 nouvelles fiches), `plante`, `plantes_reserve` (les 2 nouvelles fiches), `digest`, `quiz`.

### 8. Vérifier, construire, publier
```bash
cd ~/carnet-biologie
python3 build.py            # doit afficher ✓ … et « data/bundle.js écrit »
git add -A
git commit -m "Session du AAAA-MM-JJ : <animal>, <plante>, <n> actus"
git push
```
Si `build.py` affiche des erreurs, lis-les (elles sont en français, avec le fichier fautif), corrige, relance. Si `git push` échoue (authentification), laisse le commit local et signale-le dans ton compte rendu.

### 9. Compte rendu final (5 lignes max)
Date, notion et module révisés, espèces ajoutées (latin), nombre d’actus et sources, ce qui a été fait le lundi, statut du build et du push.

## Rappels de qualité
- Niveau master : utilise le vocabulaire des cours (synapomorphie, fitness inclusive, F_ST, norme de réaction…), mais définis brièvement un terme rare.
- Les « facts » doivent être vérifiables ; préfère un fait sûr à un fait spectaculaire douteux.
- Pas de conseils de consommation risqués : pour toute espèce comestible sauvage, rappelle les confusions dangereuses ; pour les champignons, rappelle de faire vérifier par un expert.
- Pour Belgique : utilise les noms belges/français usuels et cite des lieux réels d’observation.
