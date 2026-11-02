#!/usr/bin/env python3
"""Résumé de l'état du contenu, pour l'agent quotidien : python3 etat.py"""
import json, datetime
from collections import Counter
from pathlib import Path

D = Path(__file__).parent / 'data'
lire = lambda p: json.loads(p.read_text(encoding='utf-8'))
dossier = lambda n: {p.stem: lire(p) for p in sorted((D / n).glob('*.json'))}

auj = datetime.date.today()
notions = {**dossier('notions'), **dossier('comportement'), **dossier('ecologie/concepts')}
animaux, plantes, actus, sessions = dossier('animaux'), dossier('plantes'), dossier('actus'), dossier('sessions')

print(f"Aujourd’hui : {auj.isoformat()} ({['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'][auj.weekday()]}) — mois {auj.month}")
print(f"Session du jour déjà créée : {'OUI' if auj.isoformat() in sessions else 'non'}")

recent = sorted(sessions)[-7:]
print('\nModules révisés les 7 dernières sessions :', [notions[sessions[d]['revision']]['module'] for d in recent])
print('Notions déjà utilisées en révision :', sorted({s['revision'] for s in sessions.values()}))
compte = Counter(n['module'] for n in notions.values())
print('Nombre de notions par module :', dict(sorted(compte.items())))

def clades(arbre):
    out = []
    def rec(n, prof):
        if n.get('id') and not n.get('enfants'): out.append((n['id'], prof))
        for e in n.get('enfants', []): rec(e, prof + 1)
    rec(arbre, 0); return out
for nom, fiches, fichier in [('animal', animaux, 'animal'), ('végétal', plantes, 'vegetal')]:
    utilises = Counter(f['clade'] for f in fiches.values())
    feuilles = [c for c, _ in clades(lire(D / 'arbres' / f'{fichier}.json'))]
    vides = [c for c in feuilles if c not in utilises]
    print(f"\nArbre {nom} : {len(fiches)} fiches ; clades terminaux SANS fiche ({len(vides)}) : {', '.join(vides)}")
    print(f"Clades les plus fournis : {utilises.most_common(6)}")

print('\nAnimaux existants :', ', '.join(f"{f['latin']}" for f in animaux.values()))
print('\nPlantes existantes :', ', '.join(f"{f['latin']}" for f in plantes.values()))
print(f"\nPlantes « de saison » (mois {auj.month}) :", ', '.join(i for i, f in plantes.items() if auj.month in f.get('saison', [])))
print('\nDernières actus :')
for i, a in sorted(actus.items(), key=lambda x: x[1]['date'])[-10:]:
    print(f"  {a['date']}  {i}")
