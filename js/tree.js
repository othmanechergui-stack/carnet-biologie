// Cladogramme rectangulaire en SVG. Nœud : { id?, nom, enfants?: [...] }.
// opts : { explores: Set d'id surlignés, actif: id sélectionné, cible: nom mis en valeur, cliquable: bool }
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function dessiner(racine, opts = {}) {
    const ROW = 30, COL = opts.col || 46, PAD = 12;
    const noeuds = []; let feuilles = 0, profMax = 0;

    (function placer(n, prof) {
      const r = { n, prof, enfants: [] };
      profMax = Math.max(profMax, prof);
      if (n.enfants && n.enfants.length) {
        r.enfants = n.enfants.map(e => placer(e, prof + 1));
        r.y = (r.enfants[0].y + r.enfants[r.enfants.length - 1].y) / 2;
      } else { r.y = PAD + 14 + feuilles++ * ROW; }
      noeuds.push(r);
      return r;
    })(racine, 0);

    const X = p => PAD + p * COL;
    const largeurTexte = 190;
    const W = X(profMax) + largeurTexte, H = PAD * 2 + 14 + feuilles * ROW;
    let traits = '', points = '';

    for (const r of noeuds) {
      const x = X(r.prof), n = r.n;
      if (r.enfants.length) {
        const y0 = r.enfants[0].y, y1 = r.enfants[r.enfants.length - 1].y;
        traits += `<path d="M${x} ${y0}V${y1}"/>`;
        for (const e of r.enfants) traits += `<path d="M${x} ${e.y}H${X(e.prof)}"/>`;
      }
      const explore = n.id && opts.explores && opts.explores.has(n.id);
      const cls = ['nd', explore ? 'explore' : '', n.id && n.id === opts.actif ? 'actif' : '', n.nom === opts.cible ? 'cible' : ''].join(' ');
      const feuille = !r.enfants.length;
      const attrs = opts.cliquable && n.id ? ` data-action="clade" data-id="${esc(n.id)}" tabindex="0" role="button"` : '';
      points += `<g class="${cls}"${attrs}><circle cx="${x}" cy="${r.y}" r="${feuille ? 5 : 6}"/>` +
        `<text x="${x + (feuille ? 9 : 4)}" y="${feuille ? r.y + 4 : r.y - 8}"${feuille ? '' : ' class="int"'}>${esc(n.nom)}</text></g>`;
    }
    return `<svg class="arbre" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Arbre phylogénétique">` +
      `<g class="traits">${traits}</g>${points}</svg>`;
  }

  // Mini-arbre d'une fiche : (externe, (parentN, (... (parent1, espèce)))) — parents du plus proche au plus éloigné.
  function mini(espece, mini_arbre) {
    let n = { nom: espece };
    for (const p of mini_arbre.parents || []) n = { nom: '', enfants: [{ nom: p }, n] };
    const racine = { nom: '', enfants: [{ nom: mini_arbre.externe + ' (externe)' }, n] };
    return dessiner(racine, { cible: espece, col: 34 });
  }

  // Parcours utilitaire : liste plate de tous les nœuds avec leur chemin.
  function aplatir(racine) {
    const out = [];
    (function rec(n, chemin) { const c = chemin.concat(n); out.push({ n, chemin: c }); (n.enfants || []).forEach(e => rec(e, c)); })(racine, []);
    return out;
  }

  window.Arbre = { dessiner, mini, aplatir };
})();
