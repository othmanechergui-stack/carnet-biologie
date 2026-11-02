// Carnet de biologie — rendu des 7 onglets à partir de window.CARNET (data/bundle.js).
(function () {
  const D = window.CARNET;
  const $app = document.getElementById('app');
  if (!D) { $app.innerHTML = '<p class="vide">Données introuvables : lance <code>python3 build.py</code> pour générer <code>data/bundle.js</code>.</p>'; return; }

  // ---------- utilitaires ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Texte riche minimal : paragraphes (ligne vide), **gras**, *italique*.
  const fmt = s => s ? esc(s).split(/\n\s*\n/).map(p => '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>') + '</p>').join('') : '';
  const alea = arr => arr[Math.floor(Math.random() * arr.length)];
  const melange = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const vals = o => Object.values(o || {});
  const T = Store.today();
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dateFr = d => { const x = new Date(d + 'T12:00:00'); return x.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
  const modNom = id => (D.modules.find(m => m.id === id) || { nom: id }).nom;
  const NOTIONS = Object.assign({}, D.notions, D.ecologie.concepts, D.comportement);
  const SESSIONS = Object.keys(D.sessions).sort();
  const UICN = { EX: 'Éteint', EW: 'Éteint à l’état sauvage', CR: 'En danger critique', EN: 'En danger', VU: 'Vulnérable', NT: 'Quasi menacé', LC: 'Préoccupation mineure', DD: 'Données insuffisantes', NE: 'Non évalué' };
  const GROUPES = { mammifere: 'mammifère', oiseau: 'oiseau', amphibien: 'amphibien', poisson: 'poisson', insecte: 'insecte', crustace: 'crustacé', arachnide: 'arachnide', mollusque: 'mollusque', annelide: 'annélide', cnidaire: 'cnidaire', echinoderme: 'échinoderme', eponge: 'éponge', tardigrade: 'tardigrade', nematode: 'nématode', agnathe: 'agnathe', cephalochorde: 'céphalocordé', urochorde: 'urochordé', arbre: 'arbre', arbuste: 'arbuste', fleur: 'fleur sauvage', liane: 'liane', assiette: 'plante de l’assiette', mousse: 'mousse / hépatique', fougere: 'fougère / prêle', champignon: 'champignon', lichen: 'lichen', algue: 'algue' };
  const grp = v => GROUPES[v] || v || '';
  const KINDS = {
    animaux: { data: D.animaux, carte: 'animal', arbre: D.arbres.animal, label: 'animal', titre: 'Animaux', emoji: '🦁' },
    plantes: { data: D.plantes, carte: 'plante', arbre: D.arbres.vegetal, label: 'plante', titre: 'Plantes', emoji: '🌿' }
  };

  // ---------- glossaire : termes techniques cliquables ----------
  const GLO = D.glossaire || [];
  const formes = new Map();
  GLO.forEach((g, i) => [g.terme, ...(g.variantes || [])].forEach(f => formes.set(f.toLowerCase(), i)));
  const motif = [...formes.keys()].sort((a, b) => b.length - a.length).map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/’/g, '[’\']')).join('|');
  const RE_T = motif ? new RegExp(`(?<![\\p{L}\\p{N}_])(${motif})(?![\\p{L}\\p{N}_])`, 'giu') : null;
  // Entoure la 1re occurrence de chaque terme (hors liens/boutons) ; `deja` évite de répéter un terme dans un même bloc.
  function lier(html, deja = new Set()) {
    if (!RE_T || !html) return html;
    let dansLien = 0;
    return html.split(/(<[^>]+>)/).map(part => {
      if (part.startsWith('<')) { if (/^<(a|button)\b/.test(part)) dansLien++; else if (/^<\/(a|button)>/.test(part)) dansLien--; return part; }
      if (dansLien) return part;
      return part.replace(RE_T, m => {
        const i = formes.get(m.toLowerCase().replace(/'/g, '’')); if (i === undefined || deja.has(i)) return m;
        deja.add(i); return `<button type="button" class="terme" data-action="terme" data-i="${i}">${m}</button>`;
      });
    }).join('');
  }
  const fmtG = (s, deja) => lier(fmt(s), deja);
  const photoHTML = (f, cls = '') => f && f.photo ? `<figure class="photo ${cls}"><img src="${esc(f.photo.url)}" alt="Photo : ${esc(f.nom)} (${esc(f.latin)})" loading="lazy" decoding="async"><figcaption>📷 ${esc(f.photo.credit)}${f.photo.credit.includes(f.photo.licence) ? '' : ' · ' + esc(f.photo.licence)} · <a href="${esc(f.photo.source)}" target="_blank" rel="noopener">iNaturalist</a></figcaption></figure>` : '';

  // Fiches « à revoir » fournies par les données → boîte 1 de Leitner.
  for (const n of vals(NOTIONS)) if (n.a_revoir) Store.semer('notion:' + n.id, n.a_revoir.erreur);

  // ---------- fiabilité des actus ----------
  function fiabilite(g) {
    if (!g) return { cls: 'moyen', label: 'Prometteur' };
    const preprint = g.publication === 'preprint';
    const horsVivant = g.modele === 'in vitro' || g.modele === 'modelisation';
    if (preprint || g.ecart_titre === 'fort' || horsVivant) return { cls: 'faible', label: '🔴 À prendre avec des pincettes' };
    if (g.publication === 'revue' && g.ecart_titre === 'faible' && (g.design === 'causalite' || g.grand_echantillon)) return { cls: 'fort', label: '🟢 Solide' };
    return { cls: 'moyen', label: '🟡 Prometteur' };
  }
  const badgesGrille = g => g ? `<div class="badges">
    <span class="badge">Modèle : ${esc(g.modele)}</span><span class="badge">${esc(g.echantillon || 'n ?')}</span>
    <span class="badge">${g.publication === 'revue' ? 'Revue à comité' : 'Preprint'}</span>
    <span class="badge">${g.design === 'causalite' ? 'Causalité' : 'Corrélation'}</span>
    <span class="badge">Écart titre/résultat : ${esc(g.ecart_titre)}</span>
    <span class="badge fiab ${fiabilite(g).cls}">${fiabilite(g).label}</span></div>` : '';

  // ---------- cartes de quiz (Leitner) ----------
  // Identifiants : notion:<id> | actu:<id> | animal:<id> | plante:<id> | sosie:<animaux|plantes>:<id>:<i>
  function infoCarte(c) {
    const [t, a, b, i] = c.split(':');
    if (t === 'notion' && NOTIONS[a]) return { titre: NOTIONS[a].titre, module: NOTIONS[a].module, href: '#/notion/' + a };
    if (t === 'actu' && D.actus[a]) return { titre: D.actus[a].titre, module: 'actus', href: '#/actus' };
    if (t === 'animal' && D.animaux[a]) return { titre: 'Identifier : ' + D.animaux[a].nom, module: 'animaux', href: '#/animaux/' + a };
    if (t === 'plante' && D.plantes[a]) return { titre: 'Identifier : ' + D.plantes[a].nom, module: 'plantes', href: '#/plantes/' + a };
    if (t === 'sosie' && KINDS[a] && KINDS[a].data[b]) return { titre: 'Sosies : ' + KINDS[a].data[b].nom, module: a, href: `#/${a}/${b}` };
    return null;
  }

  const notesHTML = (ouverte) => `<div class="notes" hidden>
    ${ouverte ? '<textarea class="erreur" rows="2" placeholder="Si raté : mon erreur typique (facultatif)"></textarea>' : ''}
    <div class="row"><button data-action="note" data-g="savais" class="ok">Je savais</button>
    <button data-action="note" data-g="hesitant" class="mid">Hésitant</button>
    <button data-action="note" data-g="rate" class="ko">Raté</button></div></div>`;

  function etatCarte(c) {
    const l = Store.carte(c); if (!l) return '';
    return `<span class="boite" title="Boîte Leitner">Boîte ${l.boite}/5</span>` + (l.erreur && l.boite <= 2 ? ` <span class="arevoir">à revoir</span>` : '');
  }

  function carteHTML(c, opts = {}) {
    const [t, a, b, i] = c.split(':');
    const cle = opts.cle ? ` data-cle="${esc(opts.cle)}" data-date="${esc(opts.date)}"` : '';
    if (t === 'notion') {
      const n = NOTIONS[a]; if (!n) return '';
      const l = Store.carte(c), err = (l && l.erreur) || (n.a_revoir && n.a_revoir.erreur);
      return `<div class="carte" data-carte="${c}"${cle}>
        <div class="carte-tete"><a href="#/notion/${a}">${esc(n.titre)}</a> <small>${esc(modNom(n.module))}</small> ${etatCarte(c)}</div>
        ${err && (!l || l.boite <= 2) ? `<div class="erreur-notee">⚠️ Mon erreur typique : ${esc(err)}</div>` : ''}
        <p class="question">${esc(n.question)}</p>
        <textarea class="rep" rows="4" placeholder="Ta réponse…">${esc(opts.cle ? Store.reponse(opts.date, opts.cle) : '')}</textarea>
        <button data-action="voir">Voir la correction</button>
        <div class="corr" hidden><h4>Réponse modèle</h4>${fmtG(n.reponse)}
          ${n.pieges && n.pieges.length ? `<h4>Pièges courants</h4><ul>${n.pieges.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>
        ${notesHTML(true)}</div>`;
    }
    if (t === 'actu') {
      const x = D.actus[a]; if (!x || !x.quiz) return '';
      return `<div class="carte" data-carte="${c}" data-bonne="${x.quiz.bonne}">
        <div class="carte-tete">📰 Actu du ${esc(x.date)} ${etatCarte(c)}</div>
        <p class="question">${esc(x.quiz.question)}</p>
        <div class="choix">${x.quiz.choix.map((ch, k) => `<button data-action="choix" data-k="${k}">${esc(ch)}</button>`).join('')}</div>
        <div class="corr" hidden><p>Source : <a href="${esc(x.source.url)}" target="_blank" rel="noopener">${esc(x.titre)}</a></p></div>
        ${notesHTML(false)}</div>`;
    }
    if (t === 'animal' || t === 'plante') {
      const kind = t === 'animal' ? 'animaux' : 'plantes', f = KINDS[kind].data[a]; if (!f) return '';
      const autres = melange(vals(KINDS[kind].data).filter(o => o.id !== a)).slice(0, 3);
      const choix = melange([f, ...autres]);
      const indices = f.indices_quiz || [];
      return `<div class="carte" data-carte="${c}" data-bonne="${choix.indexOf(f)}">
        <div class="carte-tete">🔎 Qui est-ce ? ${etatCarte(c)}</div>
        <ol class="indices">${indices.map((x, k) => `<li${k ? ' hidden' : ''}>${esc(x)}</li>`).join('')}</ol>
        ${indices.length > 1 ? '<button data-action="indice" class="lien">Indice suivant</button>' : ''}
        <div class="choix">${choix.map((o, k) => `<button data-action="choix" data-k="${k}">${esc(o.nom)}</button>`).join('')}</div>
        <div class="corr" hidden><p>C’était <a href="#/${kind}/${f.id}"><strong>${esc(f.nom)}</strong> (<em>${esc(f.latin)}</em>)</a>.</p>${photoHTML(f, 'petite')}</div>
        ${notesHTML(false)}</div>`;
    }
    if (t === 'sosie') {
      const f = KINDS[a] && KINDS[a].data[b], s = f && f.terrain && f.terrain.sosies && f.terrain.sosies[+i];
      if (!s) return '';
      return `<div class="carte" data-carte="${c}">
        <div class="carte-tete">👯 Sosies ${etatCarte(c)}</div>
        <p class="question">Qu’est-ce qui distingue <strong>${esc(f.nom)}</strong> (<em>${esc(f.latin)}</em>) de <strong>${esc(s.espece)}</strong> ?</p>
        <textarea class="rep" rows="3" placeholder="Tes critères…"></textarea>
        <button data-action="voir">Voir la correction</button>
        <div class="corr" hidden>${fmt(s.distinguer)}</div>${notesHTML(true)}</div>`;
    }
    return '';
  }

  // ---------- vues ----------
  const sec = (titre, o, extra = '') => { if (!o) return ''; const d = new Set(); return `<section class="bloc"><h3>${titre}</h3>${fmtG(o.essentiel, d)}<div class="deep">${fmtG(o.details, d)}</div>${extra}</section>`; };
  const liensExt = f => f.liens ? `<div class="liens">${f.liens.inaturalist ? `<a href="${esc(f.liens.inaturalist)}" target="_blank" rel="noopener">iNaturalist ↗</a>` : ''}${f.liens.commons ? `<a href="${esc(f.liens.commons)}" target="_blank" rel="noopener">Wikimedia Commons ↗</a>` : ''}</div>` : '';
  const lienNotion = id => NOTIONS[id] ? `<a class="pill" href="#/notion/${id}">${esc(NOTIONS[id].titre)}</a>` : '';
  const lienEspece = id => D.animaux[id] ? `<a class="pill" href="#/animaux/${id}">🦁 ${esc(D.animaux[id].nom)}</a>` : D.plantes[id] ? `<a class="pill" href="#/plantes/${id}">🌿 ${esc(D.plantes[id].nom)}</a>` : '';

  function vueFiche(kind, id) {
    const K = KINDS[kind], f = K.data[id];
    if (!f) return '<p class="vide">Fiche introuvable.</p>';
    Store.marquerLu(kind, id);
    const dejaPhylo = new Set();
    const phylo = `<section class="bloc"><h3>🧬 Phylogénie</h3><ol class="phylo">${(f.phylogenie || []).map(p =>
      `<li><span class="rang">${esc(p.rang)}</span> <strong>${esc(p.nom)}</strong>${p.synapomorphies && p.synapomorphies.length ? `<div class="syn">${lier(p.synapomorphies.map(esc).join(' · '), dejaPhylo)}</div>` : ''}</li>`).join('')}</ol>
      <p class="petit">💡 Touche un terme souligné pour sa définition · <a href="#/glossaire">Glossaire</a></p>
      ${f.mini_arbre ? `<div class="scroll-x">${Arbre.mini(f.latin, f.mini_arbre)}</div>` : ''}
      ${f.clade ? `<p><a href="#/${kind}/arbre?c=${esc(f.clade)}">Voir dans l’arbre du vivant →</a></p>` : ''}</section>`;
    const ident = f.identification ? `<section class="bloc"><h3>🔍 Identification</h3><dl class="ident">${Object.entries(f.identification).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>` : '';
    const eco = f.ecologie ? sec('🌍 Écologie', f.ecologie, `${f.ecologie.uicn ? `<p><span class="badge uicn-${esc(f.ecologie.uicn)}">UICN : ${esc(f.ecologie.uicn)} — ${esc(UICN[f.ecologie.uicn] || '')}</span></p>` : ''}${f.ecologie.menaces && f.ecologie.menaces.length ? `<p><strong>Menaces :</strong> ${f.ecologie.menaces.map(esc).join(' ; ')}</p>` : ''}`) : '';
    const usages = f.usages ? sec('🍽️ Usages & cuisine', f.usages, `${f.usages.cueillette ? `<p><strong>Cueillette :</strong> ${esc(f.usages.cueillette)}</p>` : ''}${f.usages.confusions_dangereuses && f.usages.confusions_dangereuses.length ? `<div class="danger"><strong>⚠️ Confusions dangereuses :</strong><ul>${f.usages.confusions_dangereuses.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`) : '';
    const comp = f.comportement ? sec('🐾 Comportement', f.comportement, f.comportement.concepts && f.comportement.concepts.length ? `<p class="pills">Concepts du cours : ${f.comportement.concepts.map(lienNotion).join(' ')}</p>` : '') : '';
    const t = f.terrain;
    const terrain = t ? `<section class="bloc"><h3>🥾 Sur le terrain</h3>${t.ou ? `<p><strong>Où :</strong> ${esc(t.ou)}</p>` : ''}${t.quand ? `<p><strong>Quand :</strong> ${esc(t.quand)}</p>` : ''}
      ${t.criteres && t.criteres.length ? `<p><strong>Critères :</strong></p><ul>${t.criteres.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${t.sosies && t.sosies.length ? `<p><strong>Sosies :</strong></p><ul>${t.sosies.map(s => `<li><strong>${esc(s.espece)}</strong> — ${esc(s.distinguer)}</li>`).join('')}</ul>` : ''}</section>` : '';
    return `<article class="fiche">
      <header class="fiche-tete"><p class="sur">${K.emoji} ${esc(grp(f.groupe || f.type))}${f.belgique ? ' · 🇧🇪 présent en Belgique' : ''}</p>
        <h2>${esc(f.nom)}</h2><p class="latin">${esc(f.latin)}</p>${liensExt(f)}</header>
      ${photoHTML(f)}
      ${phylo}${sec('🔬 Caractéristiques', f.caracteristiques)}${sec('🔬 Anatomie & reproduction', f.anatomie)}${ident}${comp}${eco}${usages}
      <section class="bloc"><h3>✨ Facts marquants</h3><ul>${(f.facts || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${f.anecdote ? `<p class="anecdote">💬 ${esc(f.anecdote)}</p>` : ''}</section>
      ${terrain}
      ${f.notions && f.notions.length ? `<section class="bloc"><h3>📚 Notions de cours liées</h3><p class="pills">${f.notions.map(lienNotion).join(' ')}</p></section>` : ''}
      ${f.sources && f.sources.length ? `<p class="petit">Sources : ${f.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.nom)}</a>`).join(', ')}</p>` : ''}
    </article>`;
  }

  function sessionDu(date) {
    if (D.sessions[date]) return D.sessions[date];
    const avant = SESSIONS.filter(d => d <= date); return avant.length ? D.sessions[avant[avant.length - 1]] : null;
  }

  function choisirLeitner(exclure) {
    const due = Store.dues().find(c => !exclure.includes(c) && infoCarte(c));
    if (due) return due;
    const neuves = Object.keys(D.notions).map(id => 'notion:' + id).filter(c => !Store.carte(c) && !exclure.includes(c));
    return neuves.length ? alea(neuves) : null;
  }

  // 1. Aujourd'hui
  function vueAujourdhui(date) {
    const demandee = date || T, s = sessionDu(demandee);
    if (!s) return '<p class="vide">Aucune session pour l’instant.</p>';
    const mode = Store.prefs().mode;
    document.body.classList.toggle('express', mode === 'express');
    const i = SESSIONS.indexOf(s.date), prev = SESSIONS[i - 1], next = SESSIONS[i + 1];
    const n = NOTIONS[s.revision], a = D.animaux[s.animal], p = D.plantes[s.plante], dRev = new Set();
    const quiz = []; for (const q of s.quiz || []) {
      if (q.type === 'leitner') { const c = choisirLeitner(quiz); if (c) quiz.push(c); }
      else if (q.type === 'notion') quiz.push('notion:' + q.ref);
      else if (q.type === 'actu') quiz.push('actu:' + q.ref);
      else if (q.type === 'identifier') quiz.push((D.animaux[q.ref] ? 'animal:' : 'plante:') + q.ref);
    }
    return `<div class="jour">
      <div class="nav-date">${prev ? `<a href="#/aujourdhui/${prev}" aria-label="Session précédente">←</a>` : '<span></span>'}
        <select data-action="date" aria-label="Choisir une date">${SESSIONS.slice().reverse().map(d => `<option value="${d}"${d === s.date ? ' selected' : ''}>${dateFr(d)}</option>`).join('')}</select>
        ${next ? `<a href="#/aujourdhui/${next}" aria-label="Session suivante">→</a>` : '<span></span>'}</div>
      ${s.date !== demandee ? `<p class="info">Pas encore de session pour aujourd’hui : voici la plus récente.</p>` : ''}
      <div class="mode" role="group" aria-label="Durée"><button data-action="mode" data-m="express" class="${mode === 'express' ? 'on' : ''}">⚡ Express ≈10 min</button><button data-action="mode" data-m="approfondi" class="${mode !== 'express' ? 'on' : ''}">📖 Approfondi ≈25 min</button></div>

      ${n ? `<section class="bloc"><h3>🔬 Révision du cours</h3><p class="petit">${esc(modNom(n.module))} · <span class="source">${esc(n.source)}</span></p>
        <h4>${esc(n.titre)}</h4>${fmtG(n.essentiel, dRev)}<div class="deep">${fmtG(n.details, dRev)}</div>
        ${carteHTML('notion:' + n.id, { cle: 'revision', date: s.date })}</section>` : ''}

      ${s.bonus ? `<section class="bloc"><h3>🧠 Concept bonus</h3><h4>${esc(s.bonus.titre)}</h4>${fmtG(s.bonus.essentiel)}<div class="deep">${fmtG(s.bonus.details)}</div>${s.bonus.lien_notion ? `<p class="pills">${lienNotion(s.bonus.lien_notion)}</p>` : ''}</section>` : ''}

      <div class="duo">
        ${a ? `<section class="bloc"><h3>🦁 Animal du jour</h3><h4>${esc(a.nom)} <em class="latin">${esc(a.latin)}</em></h4>${photoHTML(a, 'moyenne')}${fmt(a.resume)}<a class="btn" href="#/animaux/${a.id}">Fiche complète →</a></section>` : ''}
        ${p ? `<section class="bloc"><h3>🌿 Plante du jour</h3><h4>${esc(p.nom)} <em class="latin">${esc(p.latin)}</em></h4>${photoHTML(p, 'moyenne')}${fmt(p.resume)}<a class="btn" href="#/plantes/${p.id}">Fiche complète →</a></section>` : ''}
      </div>

      <section class="bloc"><h3>📰 Digest</h3>${(s.digest || []).map(id => actuHTML(D.actus[id])).join('')}</section>

      <section class="bloc"><h3>✅ Quiz du jour</h3>${quiz.map(c => carteHTML(c)).join('') || '<p class="vide">Pas de question.</p>'}</section>
    </div>`;
  }

  function actuHTML(x) {
    if (!x) return '';
    return `<article class="actu"><h4>${esc(x.titre)}</h4><p class="petit">${esc(x.date)} · <a href="${esc(x.source.url)}" target="_blank" rel="noopener">${esc(x.source.nom)} ↗</a>${x.source_presse ? ` · <a href="${esc(x.source_presse.url)}" target="_blank" rel="noopener">${esc(x.source_presse.nom)} ↗</a>` : ''}</p>
      ${fmt(x.resume)}${badgesGrille(x.grille)}
      <p class="pills">${(x.themes || []).map(t => `<span class="pill neutre">${esc(t)}</span>`).join(' ')}${x.module ? ` <a class="pill" href="#/revision?m=${esc(x.module)}">📚 ${esc(modNom(x.module))}</a>` : ''}</p></article>`;
  }

  // 2 & 3. Animaux / Plantes
  const sousNav = (kind, actif) => {
    const items = kind === 'animaux'
      ? [['', 'Du jour'], ['liste', 'Toutes'], ['arbre', 'Arbre'], ['comportement', 'Comportement'], ['jeux', 'Jeux']]
      : [['', 'Du jour'], ['liste', 'Toutes'], ['arbre', 'Arbre'], ['base', 'Botanique de base'], ['jeux', 'Jeux']];
    return `<nav class="sous">${items.map(([k, l]) => `<a href="#/${kind}${k ? '/' + k : ''}" class="${actif === k ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
  };

  function vueDuJour(kind) {
    const K = KINDS[kind], s = sessionDu(T);
    const id = s && (kind === 'animaux' ? s.animal : s.plante);
    return `${sousNav(kind, '')}<div class="row actions">
      <button data-action="encore" data-kind="${kind}">🎲 Encore ${kind === 'animaux' ? 'un animal' : 'une plante'}</button>
      <button data-action="claude" data-kind="${kind}">✨ Générer avec Claude</button></div>
      ${id ? vueFiche(kind, id) : '<p class="vide">Pas de fiche du jour.</p>'}`;
  }

  let filtres = { animaux: {}, plantes: {} };
  function vueListe(kind) {
    const K = KINDS[kind], F = filtres[kind], tous = vals(K.data);
    const opts = (champ, label) => {
      const v = [...new Set(tous.flatMap(f => [].concat(f[champ] || [])))].sort();
      return `<select data-action="filtre" data-kind="${kind}" data-champ="${champ}"><option value="">${label}</option>${v.map(x => `<option value="${esc(x)}"${F[champ] === x ? ' selected' : ''}>${esc(champ === 'milieu' ? x.replace('-', ' ') : grp(x))}</option>`).join('')}</select>`;
    };
    const mois = new Date().getMonth() + 1;
    const liste = tous.filter(f =>
      (!F.groupe || f.groupe === F.groupe) && (!F.type || f.type === F.type) &&
      (!F.milieu || (f.milieu || []).includes(F.milieu)) && (!F.belgique || f.belgique) &&
      (!F.saison || (f.saison || []).includes(mois)) &&
      (!F.lu || (F.lu === 'lu') === Store.estLu(kind, f.id))
    ).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return `${sousNav(kind, 'liste')}<div class="filtres">
      ${kind === 'animaux' ? opts('groupe', 'Tous les groupes') + opts('milieu', 'Tous les milieux') : opts('type', 'Tous les types') + opts('milieu', 'Tous les milieux')}
      <label><input type="checkbox" data-action="filtre" data-kind="${kind}" data-champ="belgique"${F.belgique ? ' checked' : ''}> 🇧🇪 Belgique</label>
      ${kind === 'plantes' ? `<label><input type="checkbox" data-action="filtre" data-kind="${kind}" data-champ="saison"${F.saison ? ' checked' : ''}> Visible ce mois-ci</label>` : ''}
      <select data-action="filtre" data-kind="${kind}" data-champ="lu"><option value="">Lu et à lire</option><option value="lu"${F.lu === 'lu' ? ' selected' : ''}>Déjà lu</option><option value="alire"${F.lu === 'alire' ? ' selected' : ''}>À lire</option></select></div>
      <p class="petit">${liste.length} fiche(s)</p>
      <div class="grille">${liste.map(f => `<a class="tuile${Store.estLu(kind, f.id) ? ' lu' : ''}" href="#/${kind}/${f.id}">${f.photo ? `<img class="vignette" src="${esc(f.photo.url)}" alt="" loading="lazy" decoding="async">` : ''}<strong>${esc(f.nom)}</strong><em>${esc(f.latin)}</em><small>${esc(grp(f.groupe || f.type))}${f.belgique ? ' · 🇧🇪' : ''}${Store.estLu(kind, f.id) ? ' · ✓ lu' : ''}</small></a>`).join('')}</div>`;
  }

  // Clades explorés = clade de chaque fiche lue + tous ses ancêtres.
  function explores(kind) {
    const K = KINDS[kind], plat = Arbre.aplatir(K.arbre), set = new Set();
    for (const f of vals(K.data)) if (Store.estLu(kind, f.id) && f.clade) {
      const e = plat.find(x => x.n.id === f.clade); if (e) e.chemin.forEach(n => n.id && set.add(n.id));
    }
    return { set, total: plat.filter(x => x.n.id).length };
  }

  function vueArbre(kind, cladeId) {
    const K = KINDS[kind], { set, total } = explores(kind);
    const plat = Arbre.aplatir(K.arbre), sel = plat.find(x => x.n.id === cladeId);
    let panneau = '<p class="info">Touche un nœud de l’arbre pour afficher ses synapomorphies et ses espèces.</p>';
    if (sel) {
      const ids = new Set(Arbre.aplatir(sel.n).map(x => x.n.id));
      const esp = vals(K.data).filter(f => ids.has(f.clade));
      const dArb = new Set();
      const autre = kind === 'plantes' ? vals(D.animaux).filter(f => ids.has(f.clade)) : [];
      panneau = `<section class="bloc"><p class="petit">${sel.chemin.map(n => esc(n.nom)).join(' › ')}</p><h3>${esc(sel.n.nom)}</h3>
        ${sel.n.synapomorphies && sel.n.synapomorphies.length ? `<h4>Synapomorphies</h4><ul>${sel.n.synapomorphies.map(s => `<li>${lier(esc(s), dArb)}</li>`).join('')}</ul>` : ''}
        ${fmtG(sel.n.texte, dArb)}${sel.n.source ? `<p class="petit source">Source : ${esc(sel.n.source)}</p>` : ''}
        <h4>Fiches rattachées (${esp.length + autre.length})</h4><p class="pills">${esp.concat(autre).map(f => lienEspece(f.id)).join(' ') || '<span class="petit">Aucune pour l’instant.</span>'}</p></section>`;
    }
    return `${sousNav(kind, 'arbre')}<p>Couverture : <strong>${set.size}/${total}</strong> clades explorés <span class="barre"><span style="width:${Math.round(100 * set.size / total)}%"></span></span></p>
      <div class="scroll-x arbre-zone">${Arbre.dessiner(K.arbre, { explores: set, actif: cladeId, cliquable: true })}</div>${panneau}`;
  }

  function vueComportement() {
    return `${sousNav('animaux', 'comportement')}${vals(D.comportement).sort((a, b) => a.titre.localeCompare(b.titre, 'fr')).map(c => `
      <section class="bloc"><h3>${esc(c.titre)}</h3><p class="petit">${esc(modNom(c.module))} · <span class="source">${esc(c.source)}</span></p>${fmtG(c.essentiel)}<div class="deep">${fmtG(c.details)}</div>
      <ul class="exemples">${(c.exemples || []).map(e => `<li>${e.espece ? lienEspece(e.espece) : `<strong>${esc(e.espece_libre)}</strong>`} — ${esc(e.texte)}</li>`).join('')}</ul>
      <a href="#/notion/${c.id}">Fiche & question →</a></section>`).join('')}`;
  }

  function vueBase() {
    const l = vals(D.notions).filter(n => n.categorie === 'botanique-base');
    return `${sousNav('plantes', 'base')}<div class="liste">${l.map(n => itemNotion(n)).join('')}</div>`;
  }

  function vueJeux(kind) {
    const K = KINDS[kind], ids = Object.keys(K.data);
    const avecSosies = vals(K.data).filter(f => f.terrain && f.terrain.sosies && f.terrain.sosies.length);
    const s = avecSosies.length ? alea(avecSosies) : null;
    return `${sousNav(kind, 'jeux')}<section class="bloc"><h3>🔎 Qui est-ce ?</h3><p class="petit">Indices progressifs : phylogénie, comportement, fact. Moins tu utilises d’indices, mieux c’est.</p>
      ${ids.length ? carteHTML(K.carte + ':' + alea(ids)) : ''}</section>
      <section class="bloc"><h3>👯 Sosies</h3>${s ? carteHTML(`sosie:${kind}:${s.id}:${Math.floor(Math.random() * s.terrain.sosies.length)}`) : '<p class="vide">Pas encore de sosies.</p>'}</section>
      <button data-action="rejouer">🔄 Nouvelles questions</button>`;
  }

  // 4. Écologie
  function vueEcologie(sub, id) {
    const nav = `<nav class="sous">${[['', 'Concepts'], ['ecosysteme', 'Écosystème'], ['biodiversite', 'Biodiversité'], ['calendrier', 'Calendrier']].map(([k, l]) => `<a href="#/ecologie${k ? '/' + k : ''}" class="${(sub || '') === k ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
    if (sub === 'ecosysteme') {
      const tous = D.ecologie.ecosystemes, e = (id && tous.find(x => x.id === id)) || tous[tous.length - 1];
      if (!e) return nav + '<p class="vide">Aucun écosystème.</p>';
      return `${nav}<article class="fiche"><header class="fiche-tete"><p class="sur">Écosystème de la semaine du ${esc(e.semaine)} · ${esc(e.lieu)}</p><h2>${esc(e.nom)}</h2></header>
        ${sec('⚙️ Fonctionnement', e.fonctionnement)}
        <section class="bloc"><h3>🔑 Espèces clés</h3><p class="pills">${(e.especes_cles || []).map(x => lienEspece(x) || `<span class="pill neutre">${esc(x)}</span>`).join(' ')}</p>${e.especes_texte ? fmt(e.especes_texte) : ''}</section>
        <section class="bloc"><h3>⚠️ Menaces</h3><ul>${(e.menaces || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul></section>
        <section class="bloc"><h3>👀 À observer en cette saison</h3>${fmt(e.a_observer)}</section>
        ${e.notions ? `<p class="pills">${e.notions.map(lienNotion).join(' ')}</p>` : ''}</article>
        <h3>Archives</h3><ul>${tous.slice().reverse().map(x => `<li><a href="#/ecologie/ecosysteme/${x.id}">${esc(x.semaine)} — ${esc(x.nom)}</a></li>`).join('')}</ul>`;
    }
    if (sub === 'biodiversite') return `${nav}<div class="grille">${D.ecologie.biodiversite.map(b => `<section class="bloc stat"><p class="tendance ${esc(b.tendance)}">${b.tendance === 'hausse' ? '↗' : b.tendance === 'baisse' ? '↘' : '→'} ${esc(b.tendance)}</p><h4>${esc(b.titre)}</h4><p class="chiffre">${esc(b.chiffre)}</p>${fmt(b.texte)}<p class="petit">${b.source ? `<a href="${esc(b.source.url)}" target="_blank" rel="noopener">${esc(b.source.nom)} ↗</a> · ` : ''}maj ${esc(b.maj)}</p></section>`).join('')}</div>`;
    if (sub === 'calendrier') {
      const m = new Date().getMonth() + 1;
      const cal = D.ecologie.calendrier.slice().sort((a, b) => ((a.mois - m + 12) % 12) - ((b.mois - m + 12) % 12));
      return `${nav}${cal.map(c => `<details class="bloc"${c.mois === m ? ' open' : ''}><summary><h3>${MOIS[c.mois - 1]}${c.mois === m ? ' — ce mois-ci' : ''}</h3></summary><ul class="cal">${c.evenements.map(e => `<li><span class="pill neutre">${esc(e.type)}</span> ${esc(e.texte)} ${(e.especes || []).map(lienEspece).join(' ')}</li>`).join('')}</ul></details>`).join('')}`;
    }
    const l = vals(D.ecologie.concepts).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
    return `${nav}<div class="liste">${l.map(n => itemNotion(n)).join('')}</div>
      <section class="bloc"><h3>✅ Quiz écologie</h3>${melange(l).slice(0, 3).map(n => carteHTML('notion:' + n.id)).join('')}</section>`;
  }

  // 5. Actus
  let filtreActus = {};
  function vueActus(sub, id) {
    const nav = `<nav class="sous">${[['', 'Archive'], ['decryptage', 'Décryptage'], ['quiz', 'Quiz'], ['grille', 'Grille critique']].map(([k, l]) => `<a href="#/actus${k ? '/' + k : ''}" class="${(sub || '') === k ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
    const tous = vals(D.actus).sort((a, b) => b.date.localeCompare(a.date));
    if (sub === 'decryptage') {
      const l = D.decryptages, d = (id && l.find(x => x.id === id)) || l[l.length - 1];
      if (!d) return nav + '<p class="vide">Aucun décryptage.</p>';
      const a = D.actus[d.actu];
      const part = (t, v) => v ? `<section class="bloc"><h3>${t}</h3>${fmt(v)}</section>` : '';
      return `${nav}<article class="fiche"><header class="fiche-tete"><p class="sur">Décryptage de la semaine du ${esc(d.id)}</p><h2>${esc(d.titre)}</h2>${a ? `<p class="petit"><a href="${esc(a.source.url)}" target="_blank" rel="noopener">${esc(a.source.nom)} ↗</a></p>${badgesGrille(a.grille)}` : ''}</header>
        ${part('❓ La question de recherche', d.question)}${part('🧪 La méthode', d.methode)}${part('📊 Les résultats', d.resultats)}${part('⚠️ Les limites', d.limites)}${part('💡 Ce que ça change', d.ce_que_ca_change)}
        ${d.lien_cours ? `<section class="bloc"><h3>📚 Lien avec mes cours</h3><p>${esc(modNom(d.lien_cours.module))}</p>${fmt(d.lien_cours.texte)}<p class="pills">${(d.lien_cours.notions || []).map(lienNotion).join(' ')}</p></section>` : ''}</article>
        <h3>Archives</h3><ul>${l.slice().reverse().map(x => `<li><a href="#/actus/decryptage/${x.id}">${esc(x.id)} — ${esc(x.titre)}</a></li>`).join('')}</ul>`;
    }
    if (sub === 'quiz') {
      const passees = tous.filter(a => a.date < T && a.quiz);
      return `${nav}<p class="petit">5 questions tirées des actus passées.</p>${melange(passees).slice(0, 5).map(a => carteHTML('actu:' + a.id)).join('')}<button data-action="rejouer">🔄 Autres questions</button>`;
    }
    if (sub === 'grille') return `${nav}<section class="bloc"><h3>La grille d’esprit critique</h3>
      <ul><li><strong>Modèle</strong> : humain, animal, in vitro, modélisation ou terrain. Un résultat in vitro ou modélisé ne dit pas encore ce qui se passe dans un organisme entier.</li>
      <li><strong>Taille d’échantillon</strong> : petit n = grande variance, effets surestimés.</li>
      <li><strong>Revue ou preprint</strong> : un preprint n’a pas encore été relu par des pairs.</li>
      <li><strong>Corrélation ou causalité</strong> : seule une expérience contrôlée (ou un design quasi-expérimental solide) autorise une conclusion causale.</li>
      <li><strong>Écart titre/résultat</strong> : la presse grossit-elle le résultat ?</li></ul>
      <h4>Score calculé automatiquement</h4><ul><li>🔴 <strong>Pincettes</strong> : preprint, écart fort, ou uniquement in vitro/modélisation.</li><li>🟢 <strong>Solide</strong> : revue + écart faible + design causal (ou très grand échantillon).</li><li>🟡 <strong>Prometteur</strong> : tout le reste.</li></ul></section>`;
    const themes = [...new Set(tous.flatMap(a => a.themes || []))].sort();
    const mods = [...new Set(tous.map(a => a.module).filter(Boolean))];
    const l = tous.filter(a => (!filtreActus.theme || (a.themes || []).includes(filtreActus.theme)) && (!filtreActus.module || a.module === filtreActus.module));
    return `${nav}<div class="filtres"><select data-action="filtreActus" data-champ="theme"><option value="">Tous les thèmes</option>${themes.map(t => `<option${filtreActus.theme === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <select data-action="filtreActus" data-champ="module"><option value="">Tous les modules</option>${mods.map(m => `<option value="${esc(m)}"${filtreActus.module === m ? ' selected' : ''}>${esc(modNom(m))}</option>`).join('')}</select></div>
      <p class="petit">${l.length} actu(s)</p>${l.map(actuHTML).join('')}`;
  }

  // 6. Révision
  function itemNotion(n) {
    const c = Store.carte('notion:' + n.id), err = (c && c.erreur) || (n.a_revoir && n.a_revoir.erreur);
    const aRevoir = err && (!c || c.boite <= 2);
    return `<a class="item${aRevoir ? ' a-revoir' : ''}" href="#/notion/${n.id}"><strong>${esc(n.titre)}</strong>
      <small>${c ? `Boîte ${c.boite}/5` : 'Jamais révisée'}${aRevoir ? ' · ⚠️ à revoir' : ''}${Store.estLu('notions', n.id) ? ' · lue' : ''}</small>
      ${aRevoir ? `<span class="erreur-notee">${esc(err)}</span>` : ''}</a>`;
  }

  let rech = '';
  function vueRevision(sub, params) {
    const dues = Store.dues().filter(infoCarte);
    if (sub === 'leitner') {
      return `<p><a href="#/revision">← Révision</a></p><h2>Répétition espacée</h2><p class="petit">${dues.length} fiche(s) due(s) aujourd’hui. Note-toi honnêtement : « Je savais » fait monter la fiche d’une boîte (retour dans 1, 2, 4, 8 puis 16 jours), « Raté » la renvoie en boîte 1.</p>
        ${dues.slice(0, 20).map(c => carteHTML(c)).join('') || '<p class="vide">Rien à réviser : reviens demain 🎉</p>'}`;
    }
    const m = params.get('m') || '';
    const groupes = {};
    for (const n of vals(NOTIONS)) {
      if (m && n.module !== m) continue;
      if (rech && !(n.titre + ' ' + n.question + ' ' + (n.essentiel || '')).toLowerCase().includes(rech.toLowerCase())) continue;
      (groupes[n.module] = groupes[n.module] || []).push(n);
    }
    return `<h2>Révision</h2>
      <a class="btn grand" href="#/revision/leitner">🗂️ Réviser les fiches dues (${dues.length})</a>
      <p><a href="#/glossaire">📖 Glossaire des termes techniques (${GLO.length})</a></p>
      <section class="bloc"><h3>Maîtrise par module</h3>${tableMaitrise()}</section>
      <div class="filtres"><input type="search" data-action="rech" placeholder="Rechercher une notion…" value="${esc(rech)}" aria-label="Rechercher">
        <select data-action="modrev"><option value="">Tous les modules</option>${D.modules.map(x => `<option value="${x.id}"${m === x.id ? ' selected' : ''}>${esc(x.nom)}</option>`).join('')}</select></div>
      <div id="res-rev">${D.modules.filter(x => groupes[x.id]).map(x => `<h3>${esc(x.nom)}</h3><div class="liste">${groupes[x.id].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')).map(itemNotion).join('')}</div>`).join('') || '<p class="vide">Aucun résultat.</p>'}</div>`;
  }

  function tableMaitrise() {
    return `<table class="maitrise">${D.modules.map(x => {
      const l = vals(NOTIONS).filter(n => n.module === x.id); if (!l.length) return '';
      const ok = l.filter(n => { const c = Store.carte('notion:' + n.id); return c && c.boite >= 4; }).length;
      return `<tr><td><a href="#/revision?m=${x.id}">${esc(x.nom)}</a></td><td class="num">${ok}/${l.length}</td><td class="w"><span class="barre"><span style="width:${Math.round(100 * ok / l.length)}%"></span></span></td></tr>`;
    }).join('')}</table><p class="petit">Une notion est « maîtrisée » à partir de la boîte 4.</p>`;
  }

  function vueNotion(id) {
    const n = NOTIONS[id]; if (!n) return '<p class="vide">Notion introuvable.</p>';
    Store.marquerLu('notions', id);
    const dN = new Set();
    return `<article class="fiche"><header class="fiche-tete"><p class="sur"><a href="#/revision?m=${esc(n.module)}">${esc(modNom(n.module))}</a></p><h2>${esc(n.titre)}</h2><p class="petit source">📄 ${esc(n.source)}</p></header>
      <section class="bloc">${fmtG(n.essentiel, dN)}${fmtG(n.details, dN)}<p class="petit">💡 Touche un terme souligné pour sa définition · <a href="#/glossaire">Glossaire</a></p></section>
      ${n.exemples ? `<section class="bloc"><h3>Exemples</h3><ul class="exemples">${n.exemples.map(e => `<li>${e.espece ? lienEspece(e.espece) : `<strong>${esc(e.espece_libre)}</strong>`} — ${esc(e.texte)}</li>`).join('')}</ul></section>` : ''}
      ${(n.liens || []).length || (n.especes || []).length ? `<p class="pills">${(n.liens || []).map(lienNotion).join(' ')} ${(n.especes || []).map(lienEspece).join(' ')}</p>` : ''}
      ${carteHTML('notion:' + id)}</article>`;
  }

  // 7. Progrès
  function vueProgres() {
    const P = Store.data, compte = {};
    for (const q of P.quiz) if (q.resultat === 'rate') compte[q.ref] = (compte[q.ref] || 0) + 1;
    const pires = Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const reconnus = k => Object.keys(P.leitner).filter(c => c.startsWith(k + ':') && P.leitner[c].boite >= 2).length;
    const ea = explores('animaux'), ev = explores('plantes');
    const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
    return `<h2>Progrès</h2>
      <div class="grille stats">
        <div class="bloc stat"><p class="chiffre">🔥 ${Store.serie()}</p><p>jour(s) d’affilée</p></div>
        <div class="bloc stat"><p class="chiffre">${Object.keys(P.lus.animaux).length}/${Object.keys(D.animaux).length}</p><p>animaux lus · ${reconnus('animal')} reconnus</p></div>
        <div class="bloc stat"><p class="chiffre">${Object.keys(P.lus.plantes).length}/${Object.keys(D.plantes).length}</p><p>plantes lues · ${reconnus('plante')} reconnues</p></div>
        <div class="bloc stat"><p class="chiffre">${P.quiz.length}</p><p>réponses notées</p></div>
      </div>
      <section class="bloc"><h3>Couverture des arbres</h3>
        <p>Animal : ${ea.set.size}/${ea.total} clades <span class="barre"><span style="width:${pct(ea.set.size, ea.total)}%"></span></span></p>
        <p>Végétal : ${ev.set.size}/${ev.total} clades <span class="barre"><span style="width:${pct(ev.set.size, ev.total)}%"></span></span></p></section>
      <section class="bloc"><h3>Notions maîtrisées</h3>${tableMaitrise()}</section>
      <section class="bloc"><h3>Les plus ratées</h3>${pires.length ? `<ol>${pires.map(([c, k]) => { const i = infoCarte(c); return i ? `<li><a href="${i.href}">${esc(i.titre)}</a> — ${k}×${P.leitner[c] && P.leitner[c].erreur ? ` <span class="erreur-notee">${esc(P.leitner[c].erreur)}</span>` : ''}</li>` : ''; }).join('')}</ol>` : '<p class="vide">Rien de raté pour l’instant.</p>'}</section>
      <section class="bloc"><h3>Historique des quiz</h3>${P.quiz.length ? `<table class="histo">${P.quiz.slice(-30).reverse().map(q => { const i = infoCarte(q.ref); return `<tr><td>${esc(q.date)}</td><td>${i ? `<a href="${i.href}">${esc(i.titre)}</a>` : esc(q.ref)}</td><td class="r-${q.resultat}">${{ savais: '✓ savais', hesitant: '~ hésitant', rate: '✗ raté' }[q.resultat]}</td></tr>`; }).join('')}</table>` : '<p class="vide">Pas encore de quiz.</p>'}</section>
      <section class="bloc"><h3>Transférer ma progression</h3><p class="petit">Ta progression est enregistrée uniquement dans ce navigateur. Pour passer du téléphone à l’ordinateur : <strong>Exporter</strong> ici, envoie-toi le fichier, puis <strong>Importer</strong> sur l’autre appareil (cela remplace la progression de cet appareil).</p>
        <div class="row"><button data-action="exporter">⬇️ Exporter (JSON)</button><label class="btn">⬆️ Importer<input type="file" accept="application/json,.json" data-action="importer" hidden></label></div></section>`;
  }

  let rechG = '';
  function vueGlossaire() {
    const q = rechG.toLowerCase(), groupes = {};
    GLO.forEach((g, i) => {
      if (q && !(g.terme + ' ' + (g.variantes || []).join(' ') + ' ' + g.definition).toLowerCase().includes(q)) return;
      (groupes[g.domaine] = groupes[g.domaine] || []).push(g);
    });
    return `<p><a href="#/revision">← Révision</a></p><h2>Glossaire</h2>
      <p class="petit">${GLO.length} termes techniques. Dans les fiches, ces termes sont soulignés en pointillé : touche-les pour un rappel.</p>
      <div class="filtres"><input type="search" data-action="rechG" placeholder="Chercher un terme…" value="${esc(rechG)}" aria-label="Chercher un terme"></div>
      <div id="res-glo">${Object.keys(groupes).sort().map(d => `<h3>${esc(d.charAt(0).toUpperCase() + d.slice(1))}</h3><dl class="glossaire">${groupes[d].sort((a, b) => a.terme.localeCompare(b.terme, 'fr')).map(g => `<dt>${esc(g.terme)}${g.variantes && g.variantes.length ? ` <small>(${g.variantes.map(esc).join(', ')})</small>` : ''}</dt><dd>${lier(esc(g.definition), new Set([GLO.indexOf(g)]))}</dd>`).join('')}</dl>`).join('') || '<p class="vide">Aucun terme.</p>'}</div>`;
  }

  function vuePlus() {
    return `<h2>Plus</h2><div class="liste">${[['ecologie', '🌍 Écologie & biodiversité'], ['actus', '📰 Actus'], ['glossaire', '📖 Glossaire'], ['progres', '📈 Progrès']].map(([k, l]) => `<a class="item" href="#/${k}"><strong>${l}</strong></a>`).join('')}</div>`;
  }

  // ---------- routeur ----------
  const ONGLETS = [['aujourdhui', '☀️', 'Aujourd’hui'], ['animaux', '🦁', 'Animaux'], ['plantes', '🌿', 'Plantes'], ['ecologie', '🌍', 'Écologie'], ['actus', '📰', 'Actus'], ['revision', '🗂️', 'Révision'], ['progres', '📈', 'Progrès']];
  const MOBILE = ['aujourdhui', 'animaux', 'plantes', 'revision'];

  function rendre() {
    const [chemin, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const params = new URLSearchParams(qs || ''), [onglet = 'aujourdhui', a, b] = chemin.split('/').map(decodeURIComponent);
    let html;
    document.body.classList.remove('express');
    if (onglet === 'animaux' || onglet === 'plantes') {
      html = !a ? vueDuJour(onglet) : a === 'liste' ? vueListe(onglet) : a === 'arbre' ? vueArbre(onglet, params.get('c'))
        : a === 'jeux' ? vueJeux(onglet) : a === 'comportement' ? vueComportement() : a === 'base' ? vueBase()
        : sousNav(onglet, null) + vueFiche(onglet, a);
    } else if (onglet === 'ecologie') html = vueEcologie(a, b);
    else if (onglet === 'actus') html = vueActus(a, b);
    else if (onglet === 'revision') html = vueRevision(a, params);
    else if (onglet === 'notion') html = vueNotion(a);
    else if (onglet === 'progres') html = vueProgres();
    else if (onglet === 'plus') html = vuePlus();
    else if (onglet === 'glossaire') html = vueGlossaire();
    else html = vueAujourdhui(a);
    $app.innerHTML = html;
    document.getElementById('def').hidden = true;
    const actif = onglet === 'notion' || onglet === 'glossaire' ? 'revision' : onglet;
    document.querySelectorAll('[data-onglet]').forEach(el => el.classList.toggle('on', el.dataset.onglet === actif || (el.dataset.onglet === 'plus' && ['ecologie', 'actus', 'progres', 'plus'].includes(actif))));
    if (!keepScroll) window.scrollTo(0, 0);
    keepScroll = false;
  }
  let keepScroll = false;
  const rerendre = () => { keepScroll = true; rendre(); };

  document.getElementById('nav-haut').innerHTML = ONGLETS.map(([k, e, l]) => `<a href="#/${k}" data-onglet="${k}">${e} ${l}</a>`).join('');
  document.getElementById('nav-bas').innerHTML = ONGLETS.filter(o => MOBILE.includes(o[0])).map(([k, e, l]) => `<a href="#/${k}" data-onglet="${k}"><span>${e}</span>${l}</a>`).join('') + `<a href="#/plus" data-onglet="plus"><span>☰</span>Plus</a>`;

  // ---------- interactions (délégation) ----------
  function promptClaude(kind) {
    const K = KINDS[kind], exemple = vals(K.data)[0];
    const deja = vals(K.data).map(f => f.latin).sort().join(', ');
    return `Tu rédiges une fiche pour mon « Carnet de biologie » (je suis biologiste, niveau master ULB). Réponds UNIQUEMENT par un objet JSON valide, en français, au format exact de l’exemple ci-dessous (mêmes clés), pour UNE nouvelle espèce de type « ${K.label} ».

Contraintes :
- Espèce NON présente dans cette liste : ${deja}.
- Vérifie chaque fait ; n’invente ni chiffre ni anecdote. Si un point est incertain, omets-le.
- Phylogénie : du grand groupe à l’espèce, avec les synapomorphies de chaque nœud.
- "mini_arbre.parents" : espèces proches classées de la PLUS proche à la plus éloignée ; "externe" = groupe externe.
- Liens : page iNaturalist (avec le vrai numéro de taxon) et catégorie Wikimedia Commons.
- "clade" doit être un identifiant de nœud de l’arbre existant (ex. : celui de l’exemple ou un clade parent proche).
- Privilégie une espèce de Belgique de saison (nous sommes le ${dateFr(T)}), d’une branche de l’arbre peu couverte.

Exemple de format :
${JSON.stringify(exemple, null, 1)}`;
  }

  async function copier(texte) {
    try { await navigator.clipboard.writeText(texte); return true; }
    catch (e) {
      const t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { }
      t.remove(); return ok;
    }
  }

  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 3500);
  }

  function reveler(carte) {
    carte.querySelector('.corr') && (carte.querySelector('.corr').hidden = false);
    carte.querySelector('.notes') && (carte.querySelector('.notes').hidden = false);
    carte.querySelectorAll('.indices li').forEach(li => { li.hidden = false; });
  }

  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-action]');
    if (!e.target.closest('#def') && !(el && el.dataset.action === 'terme')) document.getElementById('def').hidden = true;
    if (!el) return;
    const act = el.dataset.action, carte = el.closest('.carte');
    if (act === 'voir') {
      const rep = carte.querySelector('.rep');
      if (rep && carte.dataset.cle) Store.reponse(carte.dataset.date, carte.dataset.cle, rep.value);
      reveler(carte); el.hidden = true;
    } else if (act === 'indice') {
      const cache = carte.querySelector('.indices li[hidden]'); if (cache) cache.hidden = false;
      if (!carte.querySelector('.indices li[hidden]')) el.hidden = true;
    } else if (act === 'choix') {
      if (carte.classList.contains('repondu')) return;
      carte.classList.add('repondu');
      const bonne = +carte.dataset.bonne, k = +el.dataset.k;
      carte.querySelectorAll('.choix button').forEach((b, i) => { b.classList.add(i === bonne ? 'juste' : i === k ? 'faux' : 'grise'); });
      const indicesVus = carte.querySelectorAll('.indices li:not([hidden])').length;
      reveler(carte);
      // Suggestion de note : bon du premier coup = savais, bon avec indices = hésitant, faux = raté.
      const g = k !== bonne ? 'rate' : indicesVus > 1 ? 'hesitant' : 'savais';
      carte.querySelector(`[data-g="${g}"]`).classList.add('suggere');
    } else if (act === 'note') {
      const err = carte.querySelector('.erreur');
      Store.noter(carte.dataset.carte, el.dataset.g, el.dataset.g === 'rate' && err && err.value.trim() ? err.value.trim() : undefined);
      const c = Store.carte(carte.dataset.carte);
      carte.querySelector('.notes').innerHTML = `<p class="note-ok">Noté ✓ — boîte ${c.boite}/5, revient le ${c.prochaine}.</p>`;
    } else if (act === 'mode') {
      Store.prefs({ mode: el.dataset.m }); rerendre();
    } else if (act === 'encore') {
      const kind = el.dataset.kind, s = sessionDu(T);
      const reserve = (s && (kind === 'animaux' ? s.animaux_reserve : s.plantes_reserve)) || [];
      const nonLus = Object.keys(KINDS[kind].data).filter(id => !Store.estLu(kind, id));
      const choix = reserve.find(id => KINDS[kind].data[id] && !Store.estLu(kind, id)) || (nonLus.length && alea(nonLus));
      if (choix) location.hash = `#/${kind}/${choix}`; else toast('Tu as tout lu ! Utilise « Générer avec Claude ».');
    } else if (act === 'claude') {
      toast(await copier(promptClaude(el.dataset.kind)) ? 'Prompt copié : colle-le dans Claude.' : 'Copie impossible sur ce navigateur.');
    } else if (act === 'clade') {
      location.hash = location.hash.split('?')[0] + '?c=' + encodeURIComponent(el.dataset.id);
    } else if (act === 'rejouer') {
      rerendre();
    } else if (act === 'terme') {
      const g = GLO[+el.dataset.i], d = document.getElementById('def');
      d.innerHTML = `<button class="fermer" data-action="fermerDef" aria-label="Fermer">✕</button><p class="def-terme">${esc(g.terme)} <small>${esc(g.domaine)}</small></p><p>${esc(g.definition)}</p><a href="#/glossaire" data-action="fermerDef">Tout le glossaire →</a>`;
      d.hidden = false; return;
    } else if (act === 'fermerDef') {
      document.getElementById('def').hidden = true;
    } else if (act === 'exporter') Store.exporter();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('def').hidden = true; if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.action === 'clade') { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });

  document.addEventListener('change', e => {
    const el = e.target, act = el.dataset.action;
    if (act === 'date') location.hash = '#/aujourdhui/' + el.value;
    else if (act === 'filtre') { filtres[el.dataset.kind][el.dataset.champ] = el.type === 'checkbox' ? el.checked : el.value; rerendre(); }
    else if (act === 'filtreActus') { filtreActus[el.dataset.champ] = el.value; rerendre(); }
    else if (act === 'modrev') location.hash = '#/revision' + (el.value ? '?m=' + el.value : '');
    else if (act === 'importer' && el.files[0]) {
      if (!confirm('Remplacer la progression de cet appareil par celle du fichier ?')) return;
      const r = new FileReader();
      r.onload = () => { const err = Store.importer(r.result); toast(err || 'Progression importée ✓'); if (!err) rerendre(); };
      r.readAsText(el.files[0]);
    }
  });

  document.addEventListener('input', e => {
    if (e.target.dataset.action === 'rechG') {
      rechG = e.target.value; const pos = e.target.selectionStart; rerendre();
      const i = document.querySelector('[data-action="rechG"]'); i.focus(); i.setSelectionRange(pos, pos); return;
    }
    if (e.target.dataset.action === 'rech') {
      rech = e.target.value; const pos = e.target.selectionStart; rerendre();
      const i = document.querySelector('[data-action="rech"]'); i.focus(); i.setSelectionRange(pos, pos);
    }
  });

  window.addEventListener('hashchange', rendre);
  rendre();
})();
