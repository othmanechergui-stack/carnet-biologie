// Progression personnelle : localStorage (clé "carnet-progress"), Leitner 5 boîtes, export/import.
(function () {
  const KEY = 'carnet-progress', PREFS = 'carnet-prefs';
  const INTERVALLES = [0, 1, 2, 4, 8, 16]; // jours avant retour, indexé par boîte 1..5

  const vide = () => ({ version: 1, jours: [], lus: { animaux: {}, plantes: {}, notions: {} }, leitner: {}, quiz: [], reponses: {} });

  function lire(cle, defaut) {
    try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; }
    catch (e) { return defaut; }
  }
  function ecrire(cle, val) {
    try { localStorage.setItem(cle, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  function valide(p) {
    return p && typeof p === 'object' && Array.isArray(p.jours) && p.lus && typeof p.leitner === 'object' && Array.isArray(p.quiz);
  }

  let P = lire(KEY, null);
  if (!valide(P)) P = vide();
  P.reponses = P.reponses || {};
  for (const k of ['animaux', 'plantes', 'notions']) P.lus[k] = P.lus[k] || {};

  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const today = () => iso(new Date());
  const plusJours = (date, n) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };

  function save() { return ecrire(KEY, P); }
  function activite() { const t = today(); if (!P.jours.includes(t)) P.jours.push(t); }

  const Store = {
    today, plusJours, get data() { return P; },

    prefs(patch) {
      const cur = lire(PREFS, { mode: 'express' });
      if (patch) { Object.assign(cur, patch); ecrire(PREFS, cur); }
      return cur;
    },

    marquerLu(type, id) {
      if (!P.lus[type][id]) { P.lus[type][id] = today(); }
      activite(); save();
    },
    estLu: (type, id) => !!P.lus[type][id],

    reponse(date, cle, texte) {
      if (texte === undefined) return (P.reponses[date] || {})[cle] || '';
      (P.reponses[date] = P.reponses[date] || {})[cle] = texte; save();
    },

    // grade : "savais" | "hesitant" | "rate"
    noter(carte, grade, erreur) {
      const c = P.leitner[carte] || { boite: 1 };
      if (grade === 'savais') c.boite = Math.min(5, c.boite + 1);
      if (grade === 'rate') { c.boite = 1; c.rates = (c.rates || 0) + 1; }
      if (erreur) c.erreur = erreur;
      c.prochaine = plusJours(today(), INTERVALLES[c.boite]);
      P.leitner[carte] = c;
      P.quiz.push({ date: today(), ref: carte, resultat: grade });
      if (P.quiz.length > 2000) P.quiz = P.quiz.slice(-2000);
      activite(); save();
    },
    carte: id => P.leitner[id],
    // Fiches pré-marquées « à revoir » dans les données : entrent en boîte 1 si inconnues.
    semer(carte, erreur) {
      if (!P.leitner[carte]) { P.leitner[carte] = { boite: 1, prochaine: today(), erreur, rates: 1 }; save(); }
    },
    dues(date) {
      const d = date || today();
      return Object.keys(P.leitner).filter(k => P.leitner[k].prochaine <= d)
        .sort((a, b) => P.leitner[a].prochaine.localeCompare(P.leitner[b].prochaine));
    },

    serie() {
      const s = new Set(P.jours); let n = 0, d = today();
      if (!s.has(d)) d = plusJours(d, -1); // la série n'est pas cassée tant que la journée n'est pas finie
      while (s.has(d)) { n++; d = plusJours(d, -1); }
      return n;
    },

    exporter() {
      const blob = new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'carnet-progression-' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
    },
    importer(texte) {
      let p; try { p = JSON.parse(texte); } catch (e) { return 'Fichier illisible (JSON invalide).'; }
      if (!valide(p)) return 'Ce fichier ne ressemble pas à une progression du Carnet.';
      P = p; P.reponses = P.reponses || {};
      return save() ? null : 'Impossible d’enregistrer (stockage du navigateur indisponible).';
    }
  };
  window.Store = Store;
})();
