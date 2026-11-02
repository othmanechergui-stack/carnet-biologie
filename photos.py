#!/usr/bin/env python3
"""Ajoute une photo sous licence libre (iNaturalist) aux fiches animaux/plantes qui n'en ont pas.

Usage : python3 photos.py            -> complète toutes les fiches sans "photo"
        python3 photos.py <id> ...   -> (re)fait seulement ces fiches
La photo n'est PAS téléchargée : on enregistre son URL, l'auteur et la licence (affichés sur le site).
Les photos « tous droits réservés » sont refusées.
"""
import json, sys, time, urllib.request
from pathlib import Path

D = Path(__file__).parent / 'data'
LICENCES = {'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', 'cc-by-nc': 'CC BY-NC',
            'cc-by-nc-sa': 'CC BY-NC-SA', 'cc-by-nd': 'CC BY-ND', 'cc-by-nc-nd': 'CC BY-NC-ND'}

def photo_libre(taxon_id):
    req = urllib.request.Request(f'https://api.inaturalist.org/v1/taxa/{taxon_id}', headers={'User-Agent': 'carnet-biologie'})
    t = json.load(urllib.request.urlopen(req, timeout=30))['results'][0]
    for tp in t.get('taxon_photos', []):
        p = tp['photo']
        if p.get('license_code') in LICENCES and p.get('medium_url'):
            return {'url': p['medium_url'], 'credit': p.get('attribution', ''), 'licence': LICENCES[p['license_code']],
                    'source': f"https://www.inaturalist.org/photos/{p['id']}"}
    return None

def main():
    cibles = set(sys.argv[1:])
    for dossier in ('animaux', 'plantes'):
        for f in sorted((D / dossier).glob('*.json')):
            o = json.loads(f.read_text(encoding='utf-8'))
            if (cibles and o['id'] not in cibles) or (not cibles and o.get('photo')):
                continue
            taxon = o['liens']['inaturalist'].rstrip('/').split('/')[-1]
            try:
                p = photo_libre(taxon)
            except Exception as e:
                print(f'  ! {o["id"]} : erreur réseau ({e})'); continue
            if p:
                o['photo'] = p
                f.write_text(json.dumps(o, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                print(f'  ✓ {o["id"]} — {p["licence"]}')
            else:
                print(f'  – {o["id"]} : aucune photo sous licence libre')
            time.sleep(1.1)  # politesse envers l'API iNaturalist

if __name__ == '__main__':
    main()
