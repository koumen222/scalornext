import React, { useState } from 'react';
import { Loader2, Wand2, Target, Zap, RefreshCw, AlertCircle, CheckCircle2, PencilLine } from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { stripHtml } from './creativeShared.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Brief marketing partagé — la MÊME préparation que le Lancement, pour chaque
// famille de créative : PRODUIT → ANGLE marketing → HOOK → SCRIPT, AVANT de
// générer le contenu. Deux modes :
//   · Auto   : un clic — l'IA choisit le meilleur angle, son premier hook et
//              écrit le script du format.
//   · Manuel : l'utilisateur choisit parmi 3 angles, puis parmi les 3 hooks
//              de l'angle, puis le script est écrit pour CE hook.
// Le script dépend du format :
//   · family 'avatar'    → monologue face caméra (avatar-script, CTA livraison)
//   · family 'ugc'/'spot'→ phrase du clip 5-6 s + brief visuel (scene-brief)
// onChange({ angleTitle, hook, script, clipPrompt }) remonte au parent.
// ─────────────────────────────────────────────────────────────────────────────

const MarketingBrief = ({ importedProduct = null, productImageUrl = '', family = 'ugc', accent = null, value = null, onChange = () => {}, onNeedProduct = null }) => {
  const [mode, setMode] = useState('auto');
  const [angleCount, setAngleCount] = useState(3); // comme le Lancement : l'utilisateur choisit
  const [angles, setAngles] = useState([]);
  const [angleIdx, setAngleIdx] = useState(-1);
  const [hookIdx, setHookIdx] = useState(-1);
  const [phase, setPhase] = useState(''); // '' | 'angles' | 'script' | 'auto'
  const [error, setError] = useState('');

  const productName = importedProduct?.name || '';
  const productContext = importedProduct?.description ? stripHtml(importedProduct.description).slice(0, 1500) : '';
  const ringCls = accent?.ring || 'ring-primary/20';
  const bgCls = accent?.bg || 'bg-primary/10';
  const textCls = accent?.text || 'text-primary';

  const requireProduct = () => {
    if (productName) return true;
    if (onNeedProduct) { onNeedProduct(); return false; }
    setError(tp('Importe d’abord un produit de ta boutique.'));
    return false;
  };

  const fetchAngles = async () => {
    // MÊME processus que le Studio Lancement : les angles et hooks sont générés
    // depuis la PAGE PRODUIT (nom + description + url), payload identique.
    const r = await creativeApi.launch.kit({
      productName, description: productContext, url: importedProduct?.url || '',
      language: 'fr', tone: 'direct', part: 'angles', angleCount,
    });
    const list = Array.isArray(r.data?.kit?.angles) ? r.data.kit.angles.filter(a => a?.title && a.hooks?.length) : [];
    if (!r.data?.success || !list.length) throw new Error(r.data?.message || tp('Génération des angles impossible'));
    setAngles(list);
    return list;
  };

  const makeScript = async (angle, hook) => {
    if (family === 'avatar') {
      const { data } = await creativeApi.lipsync.script({
        productName, productContext, productImageUrl,
        durationSec: 14, angle: angle?.title || '', hook,
      });
      if (!data?.success || !data.script) throw new Error(data?.message || tp('Génération du script impossible'));
      return { script: data.script, clipPrompt: '' };
    }
    const kind = family === 'spot' ? tp('spot publicitaire produit') : tp('clip UGC face caméra');
    const { data } = await creativeApi.montage.sceneBrief({
      productName, productContext,
      instruction: `${tp('Le plan unique d’un')} ${kind} ${tp('de 6 secondes.')} ${tp('Angle marketing')} : ${angle?.title || '—'}. ${tp('Base la phrase dite sur ce hook')} : « ${hook} ».`,
    });
    if (!data?.success || !data.scene?.voiceText) throw new Error(data?.message || tp('Génération du script impossible'));
    return { script: data.scene.voiceText, clipPrompt: data.scene.clipPrompt || '' };
  };

  const emit = (angle, hook, made) => onChange({ angleTitle: angle?.title || '', hook, script: made.script, clipPrompt: made.clipPrompt });

  // AUTO : angles → 1er angle → 1er hook → script, en un clic.
  const runAuto = async () => {
    if (!requireProduct()) return;
    setPhase('auto'); setError('');
    try {
      const list = angles.length ? angles : await fetchAngles();
      const angle = list[0]; const hook = angle.hooks[0];
      setAngleIdx(0); setHookIdx(0);
      const made = await makeScript(angle, hook);
      emit(angle, hook, made);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setPhase(''); }
  };

  // MANUEL : niveau 1 — proposer les angles.
  const runAngles = async () => {
    if (!requireProduct()) return;
    setPhase('angles'); setError('');
    try { await fetchAngles(); setAngleIdx(-1); setHookIdx(-1); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setPhase(''); }
  };

  // MANUEL : niveau 3 — script du hook choisi.
  const runScript = async (aIdx, hIdx) => {
    const angle = angles[aIdx]; const hook = angle?.hooks?.[hIdx];
    if (!angle || !hook) return;
    setPhase('script'); setError('');
    try { emit(angle, hook, await makeScript(angle, hook)); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setPhase(''); }
  };

  const busy = !!phase;
  const selAngle = angles[angleIdx] || null;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Mode auto / manuel */}
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
          {mode === 'auto' ? tp('L’IA choisit l’angle, le hook et écrit le script.') : tp('Choisis l’angle, puis le hook — le script est écrit pour ton choix.')}
        </p>
      </div>

      {/* Nombre d'angles — comme au Lancement (3 hooks par angle). */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[11.5px] font-semibold text-muted-foreground">{tp('Angles marketing')}</span>
        <div className="inline-flex bg-muted rounded-xl p-1">
          {[2, 3, 5].map((n) => (
            <button key={n} type="button" onClick={() => setAngleCount(n)} disabled={busy}
              className={`h-7 px-3 rounded-lg text-[12px] font-semibold transition-all ${angleCount === n ? `bg-card shadow-sm ${textCls}` : 'text-muted-foreground'}`}>
              {n}
            </button>
          ))}
        </div>
        <span className="text-[10.5px] text-muted-foreground">{tp('3 hooks par angle')}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 text-[12.5px]">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {mode === 'auto' ? (
        <button type="button" onClick={runAuto} disabled={busy}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-700 disabled:opacity-50">
          {phase === 'auto' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          {value?.script ? tp('Regénérer angle + hook + script') : tp('Générer angle + hook + script')}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Niveau 1 : angles */}
          <button type="button" onClick={runAngles} disabled={busy}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-background disabled:opacity-50">
            {phase === 'angles' ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
            {angles.length ? tp('Proposer d’autres angles') : tp('Proposer 3 angles marketing')}
          </button>
          {angles.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-2.5">
              {angles.map((a, i) => (
                <button key={i} type="button" disabled={busy}
                  onClick={() => { setAngleIdx(i); setHookIdx(-1); }}
                  className={`text-left rounded-xl border p-3 transition-all ${angleIdx === i ? `${bgCls} border-transparent ring-2 ${ringCls}` : 'bg-card border-border hover:border-gray-300'}`}>
                  <Target size={14} className={angleIdx === i ? textCls : 'text-muted-foreground'} />
                  <div className="text-[12.5px] font-semibold mt-1 text-foreground">{a.title}</div>
                  {a.audience && <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">{a.audience}</p>}
                  {a.description && <p className="text-[10.5px] text-muted-foreground leading-tight mt-1">{String(a.description).slice(0, 110)}</p>}
                </button>
              ))}
            </div>
          )}
          {/* Niveau 2 : hooks de l'angle choisi */}
          {selAngle && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tp('Hook — la phrase qui arrête le scroll')}</p>
              {selAngle.hooks.map((h, i) => (
                <button key={i} type="button" disabled={busy}
                  onClick={() => { setHookIdx(i); runScript(angleIdx, i); }}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 text-[12.5px] transition-all flex items-start gap-2 ${hookIdx === i ? `${bgCls} border-transparent ring-2 ${ringCls} text-foreground font-medium` : 'bg-card border-border hover:border-gray-300 text-muted-foreground'}`}>
                  <Zap size={13} className={`shrink-0 mt-0.5 ${hookIdx === i ? textCls : 'text-gray-300'}`} />
                  <span>{h}</span>
                  {hookIdx === i && phase === 'script' && <Loader2 size={13} className="animate-spin shrink-0 mt-0.5 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Résultat : angle + hook retenus, script éditable */}
      {value?.script && (
        <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground flex-wrap">
            <CheckCircle2 size={13} className={textCls} />
            {value.angleTitle && <span className="font-semibold text-foreground">{value.angleTitle}</span>}
            {value.hook && <span className="truncate">· {value.hook}</span>}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1"><PencilLine size={11} /> {tp('Script — modifiable')}</p>
            <textarea value={value.script} rows={family === 'avatar' ? 4 : 2}
              onChange={(e) => onChange({ ...value, script: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-[13px] outline-none focus:border-primary/40 resize-none" />
          </div>
          {mode === 'auto' && (
            <button type="button" onClick={runAuto} disabled={busy}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[11.5px] font-semibold text-muted-foreground hover:bg-background disabled:opacity-50">
              <RefreshCw size={12} /> {tp('Autre proposition')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketingBrief;
