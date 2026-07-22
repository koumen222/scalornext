// Conversion d'un script de lancement en scènes de montage — partagé entre
// le Studio Lancement et « Mes lancements ».

// ── Rythme de MONTEUR : la durée d'un plan dépend de son rôle narratif —
//    hook/bénéfices courts et punchy (3-4 s), problème 4-5 s, démo/preuve/CTA
//    posés (5-6 s). C'est l'alternance qui rend la vidéo dynamique.
export function durationForRole(role, words) {
  const est = Math.round((Number(words) || 10) / 2.5) || 4;
  if (role === 'hook' || role === 'benefice') return Math.max(3, Math.min(4, est));
  if (role === 'probleme' || role === 'agitation') return Math.max(4, Math.min(5, est));
  return Math.max(5, Math.min(6, est));
}

// ── Règles de MONTEUR EXPERT : la transition découle du rôle narratif du plan.
//    hook → flash blanc (choc) ; problème → dissolution (malaise) ; passage au
//    bénéfice → cercle qui s'ouvre (révélation) ; bénéfices → glissés rythmés ;
//    preuve/démo → balayage ; avant le CTA → flash blanc (impact final).
export function transitionForRole(role, nextRole) {
  if (nextRole === 'cta') return 'fadewhite';
  switch (role) {
    case 'hook': return 'fadewhite';
    case 'probleme': return nextRole === 'benefice' || nextRole === 'demo' ? 'circleopen' : 'dissolve';
    case 'benefice': return 'slideleft';
    case 'preuve': return 'wipeleft';
    case 'demo': return 'slideup';
    default: return ''; // '' → rotation dynamique du moteur
  }
}

// Découpe un script narratif en scènes (1 réplique ≈ 1 scène).
export function scriptToScenes(text) {
  const clean = String(text || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/^(hook|accroche|cta|scène|scene|voix[- ]?off|narrateur|narration)\s*[:\-–]/gim, ' ')
    .replace(/\r/g, '');
  const raw = clean.split(/\n+|(?<=[.!?…])\s+/).map((s) => s.trim()).filter((s) => s.length >= 3);
  const segments = [];
  for (const s of raw) {
    if (segments.length && (s.length < 12 || segments[segments.length - 1].length < 12)) {
      segments[segments.length - 1] = `${segments[segments.length - 1]} ${s}`.trim();
    } else {
      segments.push(s);
    }
  }
  // Au-delà de 8 plans on FUSIONNE les répliques médianes les plus courtes —
  // jamais de troncature : le hook (début) et surtout le CTA (fin du script,
  // « Cliquez sur Commander… ») arrivent TOUJOURS au studio.
  while (segments.length > 8) {
    let best = 1; let bestLen = Infinity;
    for (let i = 1; i < segments.length - 2; i += 1) {
      const len = segments[i].length + segments[i + 1].length;
      if (len < bestLen) { bestLen = len; best = i; }
    }
    segments.splice(best, 2, `${segments[best]} ${segments[best + 1]}`.trim());
  }
  const source = segments.length ? segments : [clean.trim()].filter(Boolean);
  return source.map((seg, i) => {
    const words = seg.split(/\s+/).filter(Boolean).length;
    const isLast = i === source.length - 1;
    // Dernière réplique = scène CTA (rôle marqué + flash blanc d'impact juste avant).
    const isCta = isLast && source.length > 1;
    // Durée = temps de lecture réel (~2,5 mots/s), bornée 5-6 s par plan.
    // Stratégie mixte éco (pas de storyboard IA ici) : hook et plan final en
    // vidéo, un plan intermédiaire sur deux en image animée au montage.
    const genMode = i === 0 || isLast ? 'video' : (i % 2 ? 'image' : 'video');
    // Rythme varié sans storyboard : hook court, plans médians alternés, final posé.
    const est = Math.round(words / 2.5) || 4;
    const durationSec = i === 0 ? Math.max(3, Math.min(4, est))
      : isLast ? Math.max(5, Math.min(6, est))
        : Math.max(3, Math.min(5, est));
    return {
      voiceText: seg, subtitleText: seg, clipPrompt: seg, genMode, durationSec,
      role: i === 0 ? 'hook' : (isCta ? 'cta' : ''),
      transitionOut: !isLast && i === source.length - 2 ? 'fadewhite' : '',
    };
  });
}

// Storyboard précis : privilégie les plans "scenes" (voix off + description visuelle + drapeau produit).
export function buildMontageScenes(script) {
  const all = Array.isArray(script?.scenes) ? script.scenes.filter((s) => s && (s.voiceover || s.visual || s.text)) : [];
  // Si le storyboard dépasse 10 plans, on garde les 9 premiers + LE DERNIER :
  // la scène CTA (toujours en fin de script) part systématiquement au studio.
  const sb = all.length > 10 ? [...all.slice(0, 9), all[all.length - 1]] : all;
  if (sb.length) {
    const roles = sb.map((s) => String(s.role || '').toLowerCase());
    return sb.map((s, i) => {
      const voice = String(s.voiceover || s.text || '').trim();
      const words = voice.split(/\s+/).filter(Boolean).length || 8;
      return {
        voiceText: voice,
        subtitleText: voice,
        clipPrompt: String(s.visual || '').trim(),
        showProduct: s.product !== false,
        // Stratégie mixte : le storyboard IA choisit vidéo (mouvement utile)
        // ou image animée au montage (plan illustratif, ~2-5× moins cher).
        genMode: s.media === 'image' ? 'image' : 'video',
        // Décisions de monteur expert issues du rôle narratif du plan :
        role: roles[i] || '',
        transitionOut: transitionForRole(roles[i], roles[i + 1]),
        // Plan sans produit qui vend un bénéfice/une preuve → le produit sera
        // superposé en médaillon ; highlight → cercle d'accent sur le détail.
        overlayProduct: s.product === false && ['benefice', 'preuve', 'cta'].includes(roles[i] || ''),
        highlight: s.highlight === true,
        durationSec: durationForRole(roles[i], words),
      };
    });
  }
  return scriptToScenes(script?.script || '');
}
