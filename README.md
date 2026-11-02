# 🌿 Carnet de biologie

Site personnel pour entretenir et approfondir mes connaissances en biologie :
une **page du jour** (révision de cours, concept bonus, animal et plante du jour, actus, quiz)
et une **base de connaissances** (animaux, plantes, arbres phylogénétiques, écologie, actus, révision Leitner, progrès).

- Ouvrir sur l’ordinateur : **double-cliquer sur `index.html`** (aucune installation nécessaire).
- Le contenu est dans `data/` (JSON) ; le code dans `index.html`, `css/`, `js/`.
- Formats des données : [`data/SCHEMA.md`](data/SCHEMA.md). Instructions de l’agent du matin : [`AGENT_QUOTIDIEN.md`](AGENT_QUOTIDIEN.md).

---

## Mettre le site en ligne (GitHub Pages) — pas à pas

But : avoir le site à une adresse du type **https://othmanechergui-stack.github.io/carnet-biologie/**, utilisable sur le téléphone.

> ⚠️ Le site sera **public** (comme tout site GitHub Pages gratuit). Il contient des résumés de notions et les **noms** de tes fichiers de cours, mais **pas** les cours eux-mêmes (les PDF/DOCX ne sont pas dans ce dossier). Ta progression, elle, reste dans ton navigateur.

### Étape 1 — Créer le dépôt vide sur GitHub
1. Va sur https://github.com et connecte-toi (compte `othmanechergui-stack`).
2. En haut à droite, clique sur **+** → **New repository**.
3. *Repository name* : `carnet-biologie`. Choisis **Public**.
4. **Ne coche rien** d’autre (pas de README, pas de .gitignore, pas de licence) — le dossier en contient déjà.
5. Clique **Create repository**. Laisse la page ouverte.

### Étape 2 — Envoyer le dossier sur GitHub
Le dossier est déjà un dépôt git (un « historique de versions ») avec tout le contenu enregistré. Il faut juste l’envoyer.

**Option A — avec l’application GitHub Desktop (le plus simple, sans terminal)**
1. Télécharge et installe https://desktop.github.com, puis connecte-toi avec ton compte GitHub.
2. Menu **File → Add Local Repository…**, choisis le dossier `carnet-biologie` (dans ton dossier personnel).
3. Clique **Publish repository** (ou **Push origin**) ; si on te propose un nom, garde `carnet-biologie` et **décoche « Keep this code private »**.

**Option B — avec le Terminal**
Ouvre le Terminal (Applications → Utilitaires → Terminal) et colle ces lignes une par une :
```bash
cd ~/carnet-biologie
```
```bash
git remote add origin https://github.com/othmanechergui-stack/carnet-biologie.git
```
```bash
git push -u origin main
```
GitHub demande alors de s’identifier : le mot de passe ne fonctionne plus en ligne de commande ; il faut un **jeton d’accès** (Settings → Developer settings → Personal access tokens → *Generate new token*, cocher `repo`) à coller à la place du mot de passe. C’est pour ça que l’option A est plus simple.

### Étape 3 — Activer GitHub Pages
1. Sur la page du dépôt GitHub : **Settings** (onglet en haut) → **Pages** (menu de gauche).
2. *Source* : **Deploy from a branch**. *Branch* : **main**, dossier **/ (root)**. Clique **Save**.
3. Attends 1 à 2 minutes, recharge : l’adresse du site s’affiche en haut (« Your site is live at … »).

### Étape 4 — Sur le téléphone
1. Ouvre l’adresse dans Safari (iPhone) ou Chrome (Android).
2. **Ajouter à l’écran d’accueil** (bouton Partager → « Sur l’écran d’accueil ») : le site s’ouvre ensuite comme une appli.

---

## Ma progression (quiz, Leitner, série de jours)
Elle est enregistrée **dans le navigateur** de chaque appareil (pas sur GitHub).
Pour passer de l’ordi au téléphone : onglet **Progrès → Exporter (JSON)**, envoie-toi le fichier (mail, AirDrop…), puis sur l’autre appareil **Progrès → Importer**. L’import **remplace** la progression de l’appareil.

---

## Ajouter du contenu chaque jour
L’agent du matin suit [`AGENT_QUOTIDIEN.md`](AGENT_QUOTIDIEN.md) : il écrit des fichiers JSON dans `data/`, puis :
```bash
cd ~/carnet-biologie && python3 build.py
```
`build.py` vérifie tout le contenu (fiches manquantes, liens cassés, doublons) et regroupe les JSON dans `data/bundle.js`, le fichier que lit le site. Ensuite :
```bash
git add -A && git commit -m "Session du jour" && git push
```
GitHub Pages met le site à jour automatiquement en 1 à 2 minutes.

Pour lancer l’agent automatiquement chaque matin, on peut créer une **tâche planifiée** dans Claude (par ex. tous les jours à 7 h) dont le message est : *« Suis exactement les instructions de ~/carnet-biologie/AGENT_QUOTIDIEN.md »*. Pour que la publication (`git push`) marche sans toi, il faut que GitHub Desktop ou le jeton de l’étape 2 soit configuré une fois.

## Outils
- `python3 build.py` — vérifie et construit `data/bundle.js` (`--check` pour vérifier seulement).
- `python3 etat.py` — résumé du contenu (modules récents, espèces, branches peu couvertes, saison).

## Crédits
Textes rédigés à partir des cours de l’ULB (zoologie BIOL-F-202, botanique BIOL-F-201, éthologie, sociétés animales, modules BIOL-F-450, transcriptomique) et de sources citées. Aucune image n’est copiée : chaque espèce renvoie vers iNaturalist et Wikimedia Commons. Les arbres sont dessinés en SVG par le site.
