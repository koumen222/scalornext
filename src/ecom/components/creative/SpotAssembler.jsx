import React, { useState, useEffect } from 'react';
import { Loader2, Wand2, Target, Zap, AlertCircle, Clapperboard, FileText, ChevronDown, ChevronUp, Minus, Plus, Users, RotateCcw } from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { stripHtml, ImportProductBar, LoadingBar } from './creativeShared.jsx';
import { buildMontageScenes } from './launchToMontage.js';

// ─────────────────────────────────────────────────────────────────────────────
// LE processus du Lancement, réutilisé par le Studio Vidéo :
//   réglages (nombre d'angles, ton, langue, cible imposée ou IA) → ANGLES
//   numérotés avec audience + 3 HOOKS VISIBLES → scripts générés PAR ANGLE à
//   la demande → script complet par hook (35-50 s, AIDA/PAS, CTA livraison).
// Deux sorties :
//   · mode Spot (défaut)      → « Ouvrir dans le studio »
//   · mode UGC (onUseScript)  → « Utiliser ce script » (le créateur vient après)
// Auto = mêmes réglages, l'IA choisit angle 1 / script 1.
// ─────────────────────────────────────────────────────────────────────────────

const TONES = [
  { id: 'direct', label: tp('Direct') }, { id: 'emotional', label: tp('Émotionnel') },
  { id: 'premium', label: tp('Premium') }, { id: 'fun', label: tp('Fun') },
];
const LANGS = [{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }, { id: 'es', label: 'ES' }];

function Stepper({ value, setValue, min = 1, max = 10, disabled }) {
  return (
    <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1">
      <button type="button" disabled={disabled || value <= min} onClick={() => setValue(Math.max(min, value - 1))}
        className="h-8 w-8 rounded-lg bg-card shadow-sm text-muted-foreground disabled:opacity-40 flex items-center justify-center"><Minus size={13} /></button>
      <span className="w-8 text-center text-[13px] font-bold text-foreground">{value}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => setValue(Math.min(max, value + 1))}
        className="h-8 w-8 rounded-lg bg-card shadow-sm text-muted-foreground disabled:opacity-40 flex items-center justify-center"><Plus size={13} /></button>
    </div>
  );
}

// speakerDesc (optionnel) : QUI prononce le script (flux UGC inversé — le
// personnage est configuré AVANT) → le backend adapte ton et vocabulaire.
const SpotAssembler = ({ importedProduct = null, onImport = null, onClearImport = null, accent = null, onSendToMontage = null, onUseScript = null, showImportBar = true, speakerDesc = '' }) => {
  // Spot (montage) : par défaut on PROPOSE les angles marketing (manual).
  // UGC (onUseScript) : auto conservé — l'IA choisit le script, le créateur vient après.
  const [mode, setMode] = useState(onUseScript ? 'auto' : 'manual');
  // Réglages — mêmes leviers que le Lancement + cible imposée (ou IA).
  const [angleCount, setAngleCount] = useState(3);
  const [tone, setTone] = useState('direct');
  const [language, setLanguage] = useState('fr');
  const [audience, setAudience] = useState('');
  // Suggestion LIBRE pour orienter les angles (« axe sur la récupération
  // sportive », « insiste sur le prix »…) — prioritaire côté IA.
  const [angleSuggestion, setAngleSuggestion] = useState('');
  const [angles, setAngles] = useState([]);
  const [scriptsByAngle, setScriptsByAngle] = useState({}); // { angleIdx: { hookIdx: script } }
  const [generatingAngle, setGeneratingAngle] = useState(-1);
  const [generatingHook, setGeneratingHook] = useState(''); // `${angleIdx}-${hookIdx}`
  const [openHook, setOpenHook] = useState(''); // `${angleIdx}-${hookIdx}`
  const [phase, setPhase] = useState(''); // '' | angles | auto
  const [error, setError] = useState('');
  // Infos produit saisies à la main — permettent de générer SANS produit importé,
  // ou de remplacer la fiche importée par ses propres infos.
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Priorité aux infos saisies par l'utilisateur, sinon la fiche importée.
  const productName = manualName.trim() || importedProduct?.name || '';
  const productContext = manualDesc.trim()
    ? manualDesc.trim().slice(0, 1500)
    : (importedProduct?.description ? stripHtml(importedProduct.description).slice(0, 1500) : '');
  const productImage = importedProduct?.imageUrl || importedProduct?.image || '';
  const ringCls = accent?.ring || 'ring-primary/20';
  const bgCls = accent?.bg || 'bg-primary/10';
  const textCls = accent?.text || 'text-primary';
  // MÊME payload que le Studio Lancement : la page produit est la source.
  const base = {
    productName, description: productContext, url: importedProduct?.url || '',
    language, tone, targetAudience: audience.trim(),
    speakerDesc: String(speakerDesc || '').trim(), // le script s'adapte à QUI parle
    angleSuggestion: angleSuggestion.trim(), // consigne libre, prioritaire pour les angles
  };

  const requireProduct = () => {
    if (productName || productContext) return true;
    if (onImport) { onImport(); return false; }
    setError(tp('Importe un produit, ou saisis tes propres infos ci-dessous.'));
    return false;
  };

  // ── PERSISTANCE : angles, scripts (y compris édités) et réglages sont
  //    conservés par produit — rechargement ou navigation ne perd plus rien.
  //    « Nouvelle génération » repart de zéro explicitement. ──
  const draftKey = `scalor:scripts:v1:${importedProduct?.id || 'none'}:${onUseScript ? 'ugc' : 'spot'}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || Date.now() - (d.ts || 0) > 48 * 3600 * 1000) return;
      if (Array.isArray(d.angles) && d.angles.length) {
        setAngles(d.angles);
        setScriptsByAngle(d.scriptsByAngle && typeof d.scriptsByAngle === 'object' ? d.scriptsByAngle : {});
      }
      if (d.angleCount) setAngleCount(d.angleCount);
      if (d.tone) setTone(d.tone);
      if (d.language) setLanguage(d.language);
      if (typeof d.audience === 'string') setAudience(d.audience);
      // Le mode (auto/manual) n'est PAS restauré : le flux spot doit toujours
      // rouvrir en proposant les angles (défaut manual), pas repartir en auto.
    } catch { /* brouillon illisible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ts: Date.now(), angles, scriptsByAngle, angleCount, tone, language, audience }));
    } catch { /* stockage plein */ }
  }, [draftKey, angles, scriptsByAngle, angleCount, tone, language, audience]);

  // Repart de ZÉRO (le contenu affiché est conservé jusqu'au clic).
  const newGeneration = () => {
    setAngles([]); setScriptsByAngle({}); setOpenHook(''); setError('');
    try { localStorage.removeItem(draftKey); } catch { /* — */ }
  };

  const fetchAngles = async () => {
    const r = await creativeApi.launch.kit({ ...base, part: 'angles', angleCount });
    const list = Array.isArray(r.data?.kit?.angles) ? r.data.kit.angles.filter(a => a?.title && a.hooks?.length) : [];
    if (!r.data?.success || !list.length) throw new Error(r.data?.message || tp('Génération des angles impossible'));
    setAngles(list); setScriptsByAngle({}); setOpenHook('');
    return list;
  };

  // Sauvegarde AUTOMATIQUE de chaque script généré dans la galerie création
  // (best-effort : un échec de sauvegarde ne bloque jamais le flux).
  const saveScriptsToGallery = (list) => {
    Promise.allSettled(list.map((s) => creativeApi.gallery.save({
      type: 'text',
      label: `Script ${s.framework || 'pub'} — ${String(s.hook || s.title || productName).slice(0, 140)}`,
      productName,
      content: s.script,
      meta: { kind: 'video_script', angleTitle: s.angleTitle || '', hook: s.hook || '', framework: s.framework || '', durationSec: s.durationSec || 45, hookIndex: s.hookIndex ?? null },
    }))).catch(() => {});
  };

  // Scripts d'UN angle (les 3 d'un coup) — à la demande, comme au Lancement.
  const fetchScripts = async (angle, angleIdx) => {
    setGeneratingAngle(angleIdx); setError('');
    try {
      const r = await creativeApi.launch.kit({ ...base, part: 'scripts', selectedAngle: angle });
      const list = Array.isArray(r.data?.kit?.videoScripts) ? r.data.kit.videoScripts.slice(0, 3) : [];
      if (!r.data?.success || !list.length) throw new Error(r.data?.message || tp('Génération des scripts impossible'));
      const withMeta = list.map((s, i) => ({ ...s, angleTitle: angle.title, hook: angle.hooks?.[i] || s.hook || '' }));
      setScriptsByAngle((prev) => ({ ...prev, [angleIdx]: withMeta.reduce((acc, s, i) => ({ ...acc, [i]: s }), { ...(prev[angleIdx] || {}) }) }));
      setOpenHook(`${angleIdx}-0`);
      saveScriptsToGallery(withMeta);
      return withMeta;
    } finally { setGeneratingAngle(-1); }
  };

  // Script d'UN SEUL hook — c'est l'utilisateur qui décide (un hook ou tous).
  const fetchScriptOne = async (angle, angleIdx, hi) => {
    setGeneratingHook(`${angleIdx}-${hi}`); setError('');
    try {
      const r = await creativeApi.launch.kit({ ...base, part: 'scripts', selectedAngle: angle, hookIndex: hi });
      const s0 = Array.isArray(r.data?.kit?.videoScripts) ? r.data.kit.videoScripts[0] : null;
      if (!r.data?.success || !s0?.script) throw new Error(r.data?.message || tp('Génération du script impossible'));
      const withMeta = { ...s0, angleTitle: angle.title, hook: angle.hooks?.[hi] || s0.hook || '' };
      setScriptsByAngle((prev) => ({ ...prev, [angleIdx]: { ...(prev[angleIdx] || {}), [hi]: withMeta } }));
      setOpenHook(`${angleIdx}-${hi}`);
      saveScriptsToGallery([withMeta]);
      return withMeta;
    } finally { setGeneratingHook(''); }
  };

  // Passerelle montage — payload IDENTIQUE au bouton du Studio Lancement.
  const assemble = (script, auto) => {
    if (!onSendToMontage) { setError(tp('Montage indisponible ici.')); return; }
    onSendToMontage({
      productName, productImage, productContext,
      angleTitle: script.angleTitle || '',
      scenes: buildMontageScenes(script),
      images: [], voiceoverUrl: '',
      ...(auto ? { auto: true } : {}),
    });
  };

  // AUTO : angles (réglages respectés) → angle 1 → UN script (hook 1).
  const runAuto = async () => {
    if (!requireProduct()) return;
    setPhase('auto'); setError('');
    try {
      const list = await fetchAngles();
      const scr = await fetchScriptOne(list[0], 0, 0);
      if (onUseScript) onUseScript(scr);
      else assemble(scr, true);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setPhase(''); }
  };

  const runAngles = async () => {
    if (!requireProduct()) return;
    setPhase('angles'); setError('');
    try { await fetchAngles(); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setPhase(''); }
  };

  const busy = !!phase || generatingAngle >= 0 || !!generatingHook;

  return (
    <div className="space-y-4 max-w-3xl">
      {showImportBar && <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={accent} />}

      {/* Mode + réglages — mêmes leviers que le Lancement. */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex bg-muted rounded-xl p-1">
            {[['auto', tp('Auto')], ['manual', tp('Manuel')]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setMode(id)} disabled={busy}
                className={`h-8 px-4 rounded-lg text-[12.5px] font-semibold transition-all ${mode === id ? `bg-card shadow-sm ${textCls}` : 'text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {mode === 'auto' ? tp('L’IA génère et choisit avec tes réglages.') : tp('Tu choisis l’angle, le hook et le script.')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[12px] font-semibold text-foreground block mb-1.5">{tp('Angles marketing')}</span>
            <Stepper value={angleCount} setValue={setAngleCount} min={1} max={10} disabled={busy} />
            <p className="text-[10.5px] text-muted-foreground mt-1">{tp('3 hooks par angle')}</p>
          </div>
          <div>
            <span className="text-[12px] font-semibold text-foreground block mb-1.5">{tp('Ton')}</span>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => (
                <button key={t.id} type="button" disabled={busy} onClick={() => setTone(t.id)}
                  className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition-all ${tone === t.id ? `${bgCls} border-transparent ring-2 ${ringCls} text-foreground` : 'bg-card border-border text-muted-foreground hover:border-gray-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[12px] font-semibold text-foreground block mb-1.5">{tp('Langue')}</span>
            <div className="inline-flex bg-muted rounded-xl p-1">
              {LANGS.map(l => (
                <button key={l.id} type="button" disabled={busy} onClick={() => setLanguage(l.id)}
                  className={`h-8 px-4 rounded-lg text-[12px] font-bold transition-all ${language === l.id ? `bg-card shadow-sm ${textCls}` : 'text-muted-foreground'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[12px] font-semibold text-foreground block mb-1.5">{tp('Cible')}</span>
            <div className="relative">
              <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={audience} onChange={(e) => setAudience(e.target.value)} disabled={busy}
                placeholder={tp('Laisser l’IA décider — ou impose : « femmes 25-45, Douala »')}
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-background border border-border text-[12.5px] outline-none focus:border-primary/40 transition" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="text-[12px] font-semibold text-foreground block mb-1.5">{tp('Suggestion d’angle')} <span className="font-normal text-muted-foreground">({tp('optionnel')})</span></span>
            <input value={angleSuggestion} onChange={(e) => setAngleSuggestion(e.target.value)} disabled={busy}
              placeholder={tp('Oriente les angles : « axe sur la récupération sportive », « insiste sur le prix », « peur de vieillir »…')}
              className="w-full h-9 px-3 rounded-xl bg-background border border-border text-[12.5px] outline-none focus:border-primary/40 transition" />
          </div>
          <div className="sm:col-span-2">
            <span className="text-[12px] font-semibold text-foreground block mb-1.5">
              {tp('Tes infos produit')}{' '}
              <span className="font-normal text-muted-foreground">
                ({importedProduct ? tp('remplace la fiche importée si rempli') : tp('facultatif — décris toi-même ton produit')})
              </span>
            </span>
            <input value={manualName} onChange={(e) => setManualName(e.target.value)} disabled={busy}
              placeholder={tp('Nom du produit — ex : « Créatine pure 500g »')}
              className="w-full h-9 px-3 mb-2 rounded-xl bg-background border border-border text-[12.5px] outline-none focus:border-primary/40 transition" />
            <textarea value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} disabled={busy} rows={3}
              placeholder={tp('Décris ton produit : bénéfices, cible, prix, arguments de vente… l’IA écrira les angles et scripts à partir de ça.')}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-[12.5px] outline-none focus:border-primary/40 transition resize-y" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={mode === 'auto' ? runAuto : runAngles} disabled={busy}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-700 disabled:opacity-50">
            {mode === 'auto' ? <Zap size={15} /> : <Target size={15} />}
            {mode === 'auto'
              ? (onUseScript ? tp('Générer et choisir le script (auto)') : tp('Générer et assembler (auto)'))
              : (angles.length ? tp('Générer les angles') : tp('Générer les angles'))}
          </button>
          {/* Le contenu généré est CONSERVÉ (48 h) — repartir de zéro est un
              choix explicite. */}
          {angles.length > 0 && (
            <button type="button" onClick={newGeneration} disabled={busy}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-background disabled:opacity-50">
              <RotateCcw size={13} /> {tp('Nouvelle génération')}
            </button>
          )}
        </div>
        {phase && (
          <LoadingBar expectedMs={phase === 'auto' ? 45000 : 16000}
            label={phase === 'auto' ? tp('Angles, hook et script en cours d’écriture…') : tp('Génération des angles marketing…')} />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 text-[12.5px]">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Angles numérotés : audience + description + 3 HOOKS visibles AVANT
          de générer les scripts — exactement comme au Lancement. */}
      {angles.length > 0 && (
        <div className="space-y-3">
          {angles.map((a, ai) => {
            const scripts = scriptsByAngle[ai] || {};
            const readyCount = Object.keys(scripts).length;
            return (
              <div key={ai} className="rounded-2xl border border-border bg-card">
                <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
                  <span className={`h-9 w-9 shrink-0 rounded-xl ${bgCls} ${textCls} text-[13px] font-bold flex items-center justify-center`}>{String(ai + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-foreground">{a.title}</p>
                    {a.audience && <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5"><Users size={11} className="shrink-0" /> {a.audience}</p>}
                    {a.description && <p className="text-[11.5px] text-muted-foreground leading-snug mt-1">{String(a.description).slice(0, 220)}</p>}
                  </div>
                  {readyCount < 3 && (
                    <button type="button" disabled={busy} onClick={() => fetchScripts(a, ai).catch((e) => setError(e?.response?.data?.message || e.message))}
                      className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-card text-[12px] font-bold text-foreground hover:bg-background disabled:opacity-50">
                      <FileText size={13} /> {tp('Générer les 3 scripts')}
                    </button>
                  )}
                  {readyCount > 0 && <span className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">{readyCount}/3 {tp('scripts prêts')}</span>}
                </div>
                {generatingAngle === ai && (
                  <div className="px-4 pb-2">
                    <LoadingBar expectedMs={26000} label={tp('Écriture des 3 scripts de cet angle…')} />
                  </div>
                )}

                {/* Les 3 hooks de l'angle — visibles dès la génération des angles. */}
                <div className="px-4 pb-3.5 space-y-2">
                  {a.hooks.slice(0, 3).map((h, hi) => {
                    const s = scripts?.[hi];
                    const key = `${ai}-${hi}`;
                    const open = openHook === key;
                    return (
                      <div key={hi} className="rounded-xl border border-border bg-background/60">
                        <div className="w-full flex items-start gap-2.5 px-3 py-2.5">
                          <span className={`shrink-0 text-[9.5px] font-bold uppercase tracking-wide rounded-md px-1.5 py-0.5 mt-0.5 ${s ? `${bgCls} ${textCls}` : 'bg-muted text-muted-foreground'}`}>{tp('Hook')} {hi + 1}</span>
                          <button type="button" disabled={!s} onClick={() => setOpenHook(open ? '' : key)}
                            className="flex-1 min-w-0 text-left text-[12.5px] font-medium text-foreground disabled:cursor-default">
                            {h}
                          </button>
                          {s ? (
                            <button type="button" onClick={() => setOpenHook(open ? '' : key)} className="shrink-0 mt-0.5">
                              {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                            </button>
                          ) : (
                            // C'est TOI qui décides : le script de CE hook, à la demande.
                            <button type="button" disabled={busy}
                              onClick={() => fetchScriptOne(a, ai, hi).catch((e) => setError(e?.response?.data?.message || e.message))}
                              className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary text-white text-[10.5px] font-bold hover:bg-primary-700 disabled:opacity-50">
                              <FileText size={11} /> {tp('Générer le script')}
                            </button>
                          )}
                        </div>
                        {generatingHook === key && (
                          <div className="px-3 pb-2.5">
                            <LoadingBar expectedMs={18000} label={tp('Écriture du script de ce hook…')} />
                          </div>
                        )}
                        {s && open && (
                          <div className="px-3 pb-3 space-y-2.5">
                            <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{tp('Script publicitaire')} · {s.durationSec || 45}s{s.framework ? ` · ${s.framework}` : ''} — <span className="normal-case font-medium">{tp('modifiable')}</span></p>
                            {/* ÉDITABLE : la version modifiée est celle utilisée/assemblée. */}
                            <textarea value={s.script} rows={7}
                              onChange={(e) => setScriptsByAngle((prev) => ({ ...prev, [ai]: { ...(prev[ai] || {}), [hi]: { ...s, script: e.target.value } } }))}
                              className="w-full whitespace-pre-wrap text-[12.5px] leading-6 text-foreground rounded-xl bg-card border border-border p-3 outline-none focus:border-primary/40 resize-y" />
                            {onUseScript ? (
                              <button type="button" onClick={() => onUseScript(s)}
                                className="w-full h-10 rounded-xl bg-primary text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-700">
                                <Zap size={14} /> {tp('Utiliser ce script')}
                              </button>
                            ) : (
                              <button type="button" onClick={() => assemble(s, false)}
                                className="w-full h-10 rounded-xl bg-primary text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-700">
                                <Clapperboard size={14} /> {tp('Ouvrir dans le studio')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'auto' && !angles.length && !busy && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Wand2 size={12} /> {onUseScript ? tp('Tout est généré avec tes réglages — tu valides le script puis configures ton créateur.') : tp('Tu seras redirigé vers le montage dès que le script est prêt.')}
        </p>
      )}
    </div>
  );
};

export default SpotAssembler;
