#!/usr/bin/env python3
"""Regroupe tous les JSON de data/ dans data/bundle.js (window.CARNET = {...}) et vérifie leur cohérence.

Usage : python3 build.py            -> vérifie puis écrit data/bundle.js
        python3 build.py --check    -> vérifie seulement
Code de sortie 1 (et rien n'est écrit) s'il y a la moindre erreur.
"""
import json, sys, re
from pathlib import Path

DATA = Path(__file__).parent / 'data'
erreurs = []

def err(msg): erreurs.append(msg)

def charger(p):
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        err(f'{p.relative_to(DATA)} : JSON invalide ({e})')
        return None

def dossier(nom, cle='id'):
    """Charge data/<nom>/*.json en dict {id: objet}; l'id doit égaler le nom du fichier."""
    out = {}
    for p in sorted((DATA / nom).glob('*.json')):
        o = charger(p)
        if o is None: continue
        if o.get(cle) != p.stem:
            err(f'{nom}/{p.name} : "{cle}" vaut {o.get(cle)!r}, il doit valoir "{p.stem}" (nom du fichier)')
        out[p.stem] = o
    return out

def requis(o, champs, ou):
    for c in champs:
        if o.get(c) in (None, '', []):
            err(f'{ou} : champ obligatoire manquant ou vide "{c}"')

ID_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')

def main():
    modules = charger(DATA / 'modules.json') or []
    mods = {m['id'] for m in modules}
    notions = dossier('notions')
    comportement = dossier('comportement')
    concepts = dossier('ecologie/concepts')
    animaux = dossier('animaux')
    plantes = dossier('plantes')
    actus = dossier('actus')
    decryptages = dossier('decryptages')
    ecosystemes = dossier('ecologie/ecosystemes')
    sessions = dossier('sessions', cle='date')
    arbres = {k: charger(DATA / 'arbres' / f'{k}.json') for k in ('animal', 'vegetal')}
    calendrier = charger(DATA / 'ecologie' / 'calendrier.json') or []
    biodiversite = charger(DATA / 'ecologie' / 'biodiversite.json') or []

    # Identifiants
    for nom, d in [('notions', notions), ('comportement', comportement), ('ecologie/concepts', concepts),
                   ('animaux', animaux), ('plantes', plantes), ('actus', actus), ('ecologie/ecosystemes', ecosystemes)]:
        for i in d:
            if not ID_RE.match(i): err(f'{nom}/{i}.json : identifiant invalide (minuscules, chiffres et tirets seulement)')

    toutes_notions = {}
    for nom, d in [('notions', notions), ('comportement', comportement), ('ecologie/concepts', concepts)]:
        for i, n in d.items():
            if i in toutes_notions: err(f'{nom}/{i}.json : identifiant déjà utilisé par une autre notion')
            toutes_notions[i] = n
            ou = f'{nom}/{i}.json'
            requis(n, ['titre', 'module', 'source', 'essentiel', 'question', 'reponse'], ou)
            if n.get('module') not in mods: err(f'{ou} : module inconnu {n.get("module")!r} (voir modules.json)')
    especes = {**animaux, **plantes}
    for i, n in toutes_notions.items():
        for l in n.get('liens', []):
            if l not in toutes_notions: err(f'notion {i} : lien vers une notion inexistante "{l}"')
        for e in n.get('especes', []) + [x['espece'] for x in n.get('exemples', []) if x.get('espece')]:
            if e not in especes: err(f'notion {i} : espèce inexistante "{e}"')

    # Arbres
    clades = {}
    for k, racine in arbres.items():
        if racine is None: continue
        def parcourir(n, k=k):
            if 'nom' not in n: err(f'arbres/{k}.json : nœud sans "nom"')
            if n.get('id'):
                if n['id'] in clades: err(f'arbres/{k}.json : id de clade en double "{n["id"]}"')
                clades[n['id']] = k
            for e in n.get('enfants', []): parcourir(e)
        parcourir(racine)

    # Espèces
    latins = {}
    for kind, d, arbre in [('animaux', animaux, 'animal'), ('plantes', plantes, 'vegetal')]:
        for i, f in d.items():
            ou = f'{kind}/{i}.json'
            requis(f, ['nom', 'latin', 'resume', 'phylogenie', 'facts', 'anecdote', 'liens', 'clade', 'indices_quiz'], ou)
            lat = (f.get('latin') or '').strip().lower()
            if lat in latins: err(f'{ou} : espèce en double avec {latins[lat]} ({f.get("latin")})')
            latins[lat] = ou
            c = f.get('clade')
            if c and c not in clades: err(f'{ou} : clade "{c}" absent des arbres')
            for n in f.get('notions', []) + (f.get('comportement') or {}).get('concepts', []):
                if n not in toutes_notions: err(f'{ou} : notion liée inexistante "{n}"')
            liens = f.get('liens') or {}
            if not str(liens.get('inaturalist', '')).startswith('https://www.inaturalist.org/taxa/'): err(f'{ou} : lien iNaturalist manquant ou mal formé')
            if not str(liens.get('commons', '')).startswith('https://commons.wikimedia.org/'): err(f'{ou} : lien Wikimedia Commons manquant ou mal formé')

    # Actus
    for i, a in actus.items():
        ou = f'actus/{i}.json'
        requis(a, ['date', 'titre', 'resume', 'source', 'themes', 'grille'], ou)
        if a.get('module') and a['module'] not in mods: err(f'{ou} : module inconnu {a["module"]!r}')
        g = a.get('grille') or {}
        for champ, ok in [('modele', {'humain', 'animal', 'plante', 'in vitro', 'modelisation', 'terrain'}), ('publication', {'revue', 'preprint'}),
                          ('design', {'correlation', 'causalite'}), ('ecart_titre', {'faible', 'moyen', 'fort'})]:
            if g.get(champ) not in ok: err(f'{ou} : grille.{champ} = {g.get(champ)!r}, valeurs permises : {sorted(ok)}')
        q = a.get('quiz')
        if q and not (isinstance(q.get('choix'), list) and 0 <= q.get('bonne', -1) < len(q['choix'])):
            err(f'{ou} : quiz.bonne doit être l’index (0, 1, 2…) d’un élément de quiz.choix')

    for i, d in decryptages.items():
        if d.get('actu') not in actus: err(f'decryptages/{i}.json : actu inexistante "{d.get("actu")}"')
    for i, e in ecosystemes.items():
        for n in e.get('notions', []):
            if n not in toutes_notions: err(f'ecologie/ecosystemes/{i}.json : notion inexistante "{n}"')

    # Sessions
    for date, s in sessions.items():
        ou = f'sessions/{date}.json'
        if s.get('revision') not in toutes_notions: err(f'{ou} : "revision" doit être un id de notion existant')
        if s.get('animal') not in animaux: err(f'{ou} : animal du jour inexistant "{s.get("animal")}"')
        if s.get('plante') not in plantes: err(f'{ou} : plante du jour inexistante "{s.get("plante")}"')
        for x in s.get('animaux_reserve', []):
            if x not in animaux: err(f'{ou} : animal de réserve inexistant "{x}"')
        for x in s.get('plantes_reserve', []):
            if x not in plantes: err(f'{ou} : plante de réserve inexistante "{x}"')
        for x in s.get('digest', []):
            if x not in actus: err(f'{ou} : actu du digest inexistante "{x}"')
        bl = (s.get('bonus') or {}).get('lien_notion')
        if bl and bl not in toutes_notions: err(f'{ou} : bonus.lien_notion inexistant "{bl}"')
        for q in s.get('quiz', []):
            t, r = q.get('type'), q.get('ref')
            if t == 'notion' and r not in toutes_notions: err(f'{ou} : quiz notion inexistante "{r}"')
            elif t == 'actu' and r not in actus: err(f'{ou} : quiz actu inexistante "{r}"')
            elif t == 'identifier' and r not in especes: err(f'{ou} : quiz identifier espèce inexistante "{r}"')
            elif t not in ('notion', 'actu', 'identifier', 'leitner'): err(f'{ou} : type de quiz inconnu "{t}"')

    if erreurs:
        print(f'❌ {len(erreurs)} erreur(s) — bundle.js NON écrit :')
        for e in erreurs: print('  -', e)
        sys.exit(1)

    carnet = {
        'modules': modules, 'notions': notions, 'comportement': comportement,
        'animaux': animaux, 'plantes': plantes, 'arbres': arbres,
        'ecologie': {'concepts': concepts, 'ecosystemes': sorted(ecosystemes.values(), key=lambda e: e['semaine']),
                     'calendrier': calendrier, 'biodiversite': biodiversite},
        'actus': actus, 'decryptages': sorted(decryptages.values(), key=lambda d: d['id']), 'sessions': sessions,
    }
    print(f'✓ {len(toutes_notions)} notions, {len(animaux)} animaux, {len(plantes)} plantes, {len(actus)} actus, '
          f'{len(sessions)} sessions, {len(clades)} clades')
    if '--check' in sys.argv: return
    (DATA / 'bundle.js').write_text('window.CARNET = ' + json.dumps(carnet, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('✓ data/bundle.js écrit')

if __name__ == '__main__':
    main()
