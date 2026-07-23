import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from '@/lib/router-compat';
import {
  Rocket, Target, Clapperboard, Megaphone, Mic, Image as ImageIcon, Copy, Check,
  Download, Loader2, AlertCircle, RotateCcw, Users, Wallet, Info, ExternalLink, Minus, Plus, Bookmark, Zap, ChevronDown, FileText, FolderKanban, Layers3, MousePointerClick,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { buildMontageScenes } from './launchToMontage.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, ChoiceChip, ImportProductBar, stripHtml, urlToFile, downloadFile, featureCost, getInsufficientCredits, CostChip } from './creativeShared.jsx';
import Wizard from './Wizard.jsx';

const A = ACCENTS.launch;

const LAUNCH_FORMATS = ['hero-benefits', 'problem-solution', 'social-proof', 'target-promise', 'ingredients-trust', 'comparison'];
const IMAGE_CHOICES = [2, 4, 6];
const TONES = [
  { id: 'direct', label: tp('Direct') }, { id: 'emotional', label: tp('Émotionnel') },
  { id: 'premium', label: tp('Premium') }, { id: 'fun', label: tp('Fun') },
];
const LANGS = [{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }, { id: 'es', label: 'ES' }];

// Voix off : les voix Scalor priorisées (cartes) + tout le catalogue Fish
// via le sélecteur unifié (voiceCatalog.jsx).
import { SCALOR_VOICES, DEFAULT_VOICE_ID, useFishVoices, VoicePreviewButton } from './voiceCatalog.jsx';
import { consumeLaunchResume } from './montageBridge.js';

const VOICES = [
  ...SCALOR_VOICES,
  { id: '', label: tp('Voix du modèle'), tag: tp('Neutre') },
];
const DEFAULT_VOICE = DEFAULT_VOICE_ID;

const AD_FIELDS = [
  ['campaignType', tp('Type de campagne')],
  ['objective', tp('Objectif')],
  ['audience', tp('Audience')],
  ['budget', tp('Budget & scaling')],
  ['adSets', tp('Structure d\'ad sets')],
  ['creatives', tp('Créatives')],
  ['placements', tp('Placements')],
  ['testingPlan', tp('Plan de test')],
  ['kpis', tp('KPIs')],
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Le LLM renvoie parfois des objets/tableaux imbriqués au lieu de texte
// (ex. kpis: {cpaCommande, tauxLivraison…}) — React plante si on les rend
// tels quels. On aplatit récursivement en texte lisible.
const humanizeAdKey = (key = '') => String(key)
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .toLowerCase()
  .replace(/\b(cpa|roas|ctr|cpm|cpc|kpi|cod|usd)\b/g, (m) => m.toUpperCase())
  .replace(/^./, (c) => c.toUpperCase());

const formatAdValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(formatAdValue).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => {
        const text = formatAdValue(v);
        return text ? `${humanizeAdKey(k)} : ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(value);
};

function Stepper({ value, setValue, min = 1, max = 10 }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border overflow-hidden">
      <button onClick={() => setValue(Math.max(min, value - 1))} disabled={value <= min} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-background disabled:opacity-30"><Minus size={14} /></button>
      <span className="w-10 text-center text-[14px] font-bold text-foreground">{value}</span>
      <button onClick={() => setValue(Math.min(max, value + 1))} disabled={value >= max} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-background disabled:opacity-30"><Plus size={14} /></button>
    </div>
  );
}

function Copyable({ text, className = '' }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text || ''); setDone(true); setTimeout(() => setDone(false), 1600); }}
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground ${className}`}>
      {done ? <><Check size={13} className="text-primary" /> {tp('Copié')}</> : <><Copy size={13} /> {tp('Copier')}</>}
    </button>
  );
}

// buildMontageScenes (script → scènes de montage expertes) vit désormais dans
// launchToMontage.js — partagé avec le Studio Vidéo (famille Spot).

// ── Chat de brief publicitaire ───────────────────────────────────────────────
// Remplace le formulaire : les questions du brief (pays, prix, coûts, budget,
// taux COD) sont posées une par une, façon conversation. Cliquer sur une
// réponse permet de la modifier. Le récap chiffré arrive en fin de chat.
function AdsBriefChat({ adBrief, adNumbers, metrics, onAnswer, onGenerate, onSkip }) {
  const QUESTIONS = [
    { id: 'country', type: 'text', q: tp('Dans quel pays vends-tu ce produit ?'), placeholder: tp('Ex. Cameroun') },
    { id: 'currency', type: 'choice', q: tp('Dans quelle devise sont tes prix ?'), options: ['XAF', 'XOF', 'CDF', 'USD', 'EUR'] },
    { id: 'purchaseCost', type: 'number', q: tp('Combien t’achètes-tu le produit ? (coût unitaire)'), allowZero: true },
    { id: 'sellingPrice', type: 'number', q: tp('À quel prix le vends-tu ?') },
    { id: 'variableCosts', type: 'number', q: tp('Livraison et frais variables par commande ?'), allowZero: true, zeroLabel: tp('Aucun frais') },
    { id: 'failedDeliveryCost', type: 'number', q: tp('Combien te coûte une livraison échouée ?'), allowZero: true, zeroLabel: tp('Rien') },
    { id: 'dailyBudgetUsd', type: 'number', q: tp('Quel budget publicitaire quotidien, en USD ?'), placeholder: '10', suffix: 'USD' },
    { id: 'rate', type: 'rate', q: tp('Ton taux de livraison COD estimé ?'), options: [30, 35, 40, 45, 50, 55, 60] },
  ];

  const briefComplete = !!(adBrief.country || '').trim() && adNumbers.sellingPrice > 0 && adNumbers.dailyBudgetUsd > 0;
  const [step, setStep] = useState(briefComplete ? QUESTIONS.length : 0);
  const [maxStep, setMaxStep] = useState(briefComplete ? QUESTIONS.length : 0);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [step]);

  const currency = adBrief.currency || 'XAF';
  const rateLabel = (v) => v === 30 ? `30% · ${tp('Prudent')}` : v === 45 ? `45% · ${tp('Moyen')}` : v === 60 ? `60% · ${tp('Optimiste')}` : `${v}%`;

  const answerText = (question) => {
    if (question.id === 'country') return adBrief.country;
    if (question.id === 'currency') return currency;
    if (question.id === 'rate') return rateLabel(adNumbers.deliveryRate);
    if (question.id === 'dailyBudgetUsd') return `${adNumbers.dailyBudgetUsd} USD`;
    const raw = Number(adBrief[question.id]) || 0;
    return `${raw.toLocaleString('fr-FR')} ${currency}`;
  };

  const advance = (fromIndex) => {
    setDraft('');
    if (fromIndex + 1 <= maxStep) { setStep(maxStep); return; } // édition : retour au point atteint
    setStep(fromIndex + 1);
    setMaxStep(fromIndex + 1);
  };

  const submitCurrent = (question, index, rawValue) => {
    if (question.type === 'text') {
      const v = String(rawValue ?? draft).trim();
      if (!v) return;
      onAnswer('country', v);
    } else if (question.type === 'choice') {
      onAnswer('currency', rawValue);
    } else if (question.type === 'rate') {
      onAnswer('deliveryRate', String(rawValue));
    } else {
      const v = rawValue !== undefined ? rawValue : Number(String(draft).replace(',', '.'));
      if (!Number.isFinite(v) || v < 0) return;
      if (!question.allowZero && v <= 0) return;
      onAnswer(question.id, String(v));
    }
    advance(index);
  };

  const invalidMargin = metrics.unitMargin <= 0;
  const invalidProfit = !invalidMargin && metrics.expectedProfitPerOrder <= 0;
  const canGenerate = briefComplete && !invalidMargin && !invalidProfit;

  const Bubble = ({ side, children, onClick, editable }) => (
    <div className={`flex ${side === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        onClick={onClick}
        role={editable ? 'button' : undefined}
        title={editable ? tp('Cliquer pour modifier') : undefined}
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${side === 'user'
          ? `bg-primary text-white rounded-br-md ${editable ? 'cursor-pointer hover:bg-primary-700' : ''}`
          : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="max-h-[420px] overflow-y-auto no-scrollbar space-y-3 pr-1">
        {QUESTIONS.map((question, index) => {
          const limit = Math.max(step, maxStep);
          if (index > limit) return null;
          const answered = index !== step && index < limit;
          return (
            <React.Fragment key={question.id}>
              <Bubble side="bot">{question.q}</Bubble>
              {answered && (
                <Bubble side="user" editable onClick={() => { setDraft(''); setStep(index); }}>
                  {answerText(question)}
                </Bubble>
              )}
              {!answered && index === step && (
                <div className="flex justify-end">
                  <div className="w-full sm:max-w-[85%]">
                    {question.type === 'text' && (
                      <form onSubmit={(e) => { e.preventDefault(); submitCurrent(question, index); }} className="flex gap-2">
                        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={question.placeholder}
                          className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/20" />
                        <button type="submit" disabled={!draft.trim()} className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold disabled:opacity-40">OK</button>
                      </form>
                    )}
                    {question.type === 'choice' && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {question.options.map(opt => (
                          <button key={opt} type="button" onClick={() => submitCurrent(question, index, opt)}
                            className={`h-9 px-3.5 rounded-xl border text-[12.5px] font-bold transition-colors ${currency === opt ? 'border-primary/40 bg-primary/10 text-primary' : 'border-slate-200 bg-card text-slate-600 hover:border-primary/30'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {question.type === 'rate' && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {question.options.map(v => (
                          <button key={v} type="button" onClick={() => submitCurrent(question, index, v)}
                            className={`h-9 px-3 rounded-xl border text-[12px] font-bold transition-colors ${adNumbers.deliveryRate === v ? 'border-primary/40 bg-primary/10 text-primary' : 'border-slate-200 bg-card text-slate-600 hover:border-primary/30'}`}>
                            {rateLabel(v)}
                          </button>
                        ))}
                      </div>
                    )}
                    {question.type === 'number' && (
                      <form onSubmit={(e) => { e.preventDefault(); submitCurrent(question, index); }} className="flex gap-2">
                        <div className="relative flex-1">
                          <input autoFocus type="number" min="0" step="any" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={question.placeholder || '0'}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-14 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/20" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">{question.suffix || currency}</span>
                        </div>
                        {question.allowZero && question.zeroLabel && (
                          <button type="button" onClick={() => submitCurrent(question, index, 0)} className="h-11 px-3 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-500 hover:bg-slate-50">{question.zeroLabel}</button>
                        )}
                        <button type="submit" className="h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold">OK</button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {step >= QUESTIONS.length && (
          <>
            <Bubble side="bot">
              <span className="font-bold">{tp('Voici ce que ça donne avec tes chiffres :')}</span>
              <span className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                <span className="rounded-lg bg-white/70 p-2"><span className="block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{tp('Marge si livrée')}</span><span className="block text-[13.5px] font-extrabold text-slate-900">{metrics.unitMargin.toLocaleString('fr-FR')} {currency}</span></span>
                <span className="rounded-lg bg-white/70 p-2"><span className="block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{tp('Bénéfice / commande')}</span><span className="block text-[13.5px] font-extrabold text-slate-900">{Math.round(metrics.expectedProfitPerOrder).toLocaleString('fr-FR')} {currency}</span></span>
                <span className="rounded-lg bg-white/70 p-2"><span className="block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{tp('CPA cible max')}</span><span className="block text-[13.5px] font-extrabold text-slate-900">{Math.round(metrics.targetCpa).toLocaleString('fr-FR')} {currency}</span></span>
                <span className="rounded-lg bg-white/70 p-2"><span className="block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{tp('Budget test conseillé')}</span><span className="block text-[13.5px] font-extrabold text-slate-900">{Math.round(metrics.recommendedLocalDailyBudget).toLocaleString('fr-FR')} {currency}/j</span></span>
                <span className="rounded-lg bg-white/70 p-2"><span className="block text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{tp('Structure')}</span><span className="block text-[13.5px] font-extrabold text-slate-900">{metrics.recommendedAdSetCount} ad set{metrics.recommendedAdSetCount > 1 ? 's' : ''} × 5</span></span>
              </span>
              {invalidMargin && <span className="mt-2 block text-[12px] font-semibold text-red-600">{tp('Le prix de vente doit être supérieur au coût d’achat et aux frais variables. Clique sur une réponse pour la corriger.')}</span>}
              {invalidProfit && <span className="mt-2 block text-[12px] font-semibold text-red-600">{tp('Avec ce taux de livraison et ce coût d’échec, la campagne ne serait pas rentable. Clique sur une réponse pour ajuster.')}</span>}
            </Bubble>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button onClick={onGenerate} disabled={!canGenerate}
                className="min-h-11 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Megaphone size={15} /> {tp('Générer la stratégie calculée')}
              </button>
              <button onClick={() => { setDraft(''); setStep(0); setMaxStep(0); }} className="h-10 px-3.5 rounded-xl border border-border text-muted-foreground text-[13px] font-medium hover:bg-background inline-flex items-center gap-1.5"><RotateCcw size={13} /> {tp('Recommencer')}</button>
              <button onClick={onSkip} className="h-10 px-3.5 rounded-xl border border-border text-muted-foreground text-[13px] font-medium hover:bg-background">{tp('Plus tard')}</button>
            </div>
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const LaunchStudio = ({ importedProduct, onImport, onClearImport, credits, onCreditsChange, onNeedCredits, onSendToMontage }) => {
  const [angleCount, setAngleCount] = useState(5);
  const [language, setLanguage] = useState('fr');
  const [tone, setTone] = useState('direct');
  const [imageCount, setImageCount] = useState(4);
  const [voiceRefId, setVoiceRefId] = useState(DEFAULT_VOICE);
  const [customVoice, setCustomVoice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [kit, setKit] = useState(null);
  const [images, setImages] = useState([]);
  const [voiceovers, setVoiceovers] = useState({});
  const [adsPhase, setAdsPhase] = useState('idle');   // idle | pending | done | skipped
  const [voicePhase, setVoicePhase] = useState('idle');
  const [savingKit, setSavingKit] = useState(false);
  const [kitSaved, setKitSaved] = useState(false);
  const [generatingAngle, setGeneratingAngle] = useState(null);
  const [expandedAngles, setExpandedAngles] = useState({});
  const [expandedHooks, setExpandedHooks] = useState({});
  const [generatingVoiceKey, setGeneratingVoiceKey] = useState('');
  const [activeStage, setActiveStage] = useState('angles');
  // À la carte : l'utilisateur choisit les contenus à créer, sans ordre imposé.
  // La voix-off dépend des scripts (donc du texte) — seule vraie dépendance.
  const [modules, setModules] = useState({ text: true, ads: true, voice: true, images: true });
  const toggleModule = (id) => setModules(prev => {
    const next = { ...prev, [id]: !prev[id] };
    if (id === 'voice' && next.voice) next.text = true;   // la voix lit les scripts
    if (id === 'text' && !next.text) next.voice = false;  // plus de texte → plus de voix
    return next;
  });
  const [expandedAdSets, setExpandedAdSets] = useState({});
  const [adBrief, setAdBrief] = useState({ country: '', currency: 'XAF', purchaseCost: '', sellingPrice: '', variableCosts: '', failedDeliveryCost: '', deliveryRate: '45', dailyBudgetUsd: '10' });

  // Produit MANUEL : nom, image (upload) et description saisis directement ici,
  // sans import boutique — l'import garde la priorité s'il est présent.
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualImageBusy, setManualImageBusy] = useState(false);
  const uploadManualImage = async (file) => {
    if (!file) return;
    setManualImageBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (data?.url) setManualImageUrl(data.url);
    } catch { /* upload raté : l'utilisateur peut réessayer */ }
    finally { setManualImageBusy(false); }
  };

  // Réouverture d'un lancement enregistré (« Mes lancements » → Ouvrir) :
  // restaure produit, réglages, angles, scripts, voix et affiches — prêt à
  // générer les scripts d'autres hooks avec la mécanique existante.
  useEffect(() => {
    let resume = null;
    try { resume = consumeLaunchResume(); } catch { /* bridge indisponible */ }
    if (!resume) return;
    setManualName(String(resume.productName || ''));
    setManualDesc(String(resume.description || ''));
    setManualImageUrl(String(resume.productImage || ''));
    if (resume.settings) {
      if (resume.settings.language) setLanguage(resume.settings.language);
      if (resume.settings.tone) setTone(resume.settings.tone);
      if (resume.settings.angleCount) setAngleCount(resume.settings.angleCount);
      if (resume.settings.imageCount) setImageCount(resume.settings.imageCount);
      if (resume.settings.voiceRefId) setVoiceRefId(resume.settings.voiceRefId);
    }
    if (resume.adBrief) setAdBrief((prev) => ({ ...prev, ...resume.adBrief }));
    setKit({
      angles: Array.isArray(resume.angles) ? resume.angles : [],
      videoScripts: Array.isArray(resume.scripts) ? resume.scripts : [],
      ...(resume.ads ? { facebookAds: resume.ads } : {}),
    });
    setImages(Array.isArray(resume.images) ? resume.images.map((u) => (typeof u === 'string' ? { imageUrl: u } : u)) : []);
    setVoiceovers(resume.voiceovers && !Array.isArray(resume.voiceovers) ? resume.voiceovers : {});
    setKitSaved(true); // déjà en galerie — le bouton Enregistrer repartira de là
    setActiveStage('angles');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subject = importedProduct?.name || manualName.trim();
  const productContext = importedProduct?.description
    ? stripHtml(importedProduct.description).slice(0, 1500)
    : manualDesc.trim().slice(0, 1500);
  const productImage = importedProduct?.imageUrl || manualImageUrl;
  const url = importedProduct?.url || '';
  const base = { productName: subject, description: productContext, url, language, tone };
  const adNumbers = {
    purchaseCost: Math.max(0, Number(adBrief.purchaseCost) || 0),
    sellingPrice: Math.max(0, Number(adBrief.sellingPrice) || 0),
    variableCosts: Math.max(0, Number(adBrief.variableCosts) || 0),
    failedDeliveryCost: Math.max(0, Number(adBrief.failedDeliveryCost) || 0),
    deliveryRate: Math.min(60, Math.max(30, Number(adBrief.deliveryRate) || 45)),
    dailyBudgetUsd: Math.max(0, Number(adBrief.dailyBudgetUsd) || 0),
  };
  const unitMargin = Math.max(0, adNumbers.sellingPrice - adNumbers.purchaseCost - adNumbers.variableCosts);
  const deliveryRateRatio = adNumbers.deliveryRate / 100;
  const expectedProfitPerOrder = Math.max(0, (unitMargin * deliveryRateRatio) - (adNumbers.failedDeliveryCost * (1 - deliveryRateRatio)));
  const targetCpa = expectedProfitPerOrder * 0.35;
  const recommendedLocalDailyBudget = targetCpa * 3;
  const recommendedAdSetCount = adNumbers.dailyBudgetUsd > 0 ? Math.min(8, Math.max(1, Math.ceil(adNumbers.dailyBudgetUsd / 10))) : 0;

  const pollImages = useCallback(async (jobId) => {
    const start = Date.now();
    while (Date.now() - start < 10 * 60 * 1000) {
      let job;
      try { const r = await creativeApi.image.job(jobId); job = r.data?.job; }
      catch { await sleep(2500); continue; }
      if (job?.status === 'done') return (job.result?.creatives || []).filter(c => c.imageUrl);
      if (job?.status === 'error') return (job.creatives || []).filter(c => c.imageUrl);
      await sleep(2500);
    }
    return [];
  }, []);

  // ── 1) TEXTE — angles + 3 hooks. Les scripts sont générés à la demande. ──
  const generateText = useCallback(async () => {
    if (!subject) { setError(tp('Importe un produit de ta boutique, ou renseigne au moins son nom (et idéalement sa photo) ci-dessus.')); return; }
    setLoading(true); setError(''); setImageError(''); setVoiceError('');
    setActiveStage('angles');
    setKit({}); setImages([]); setVoiceovers({}); setKitSaved(false); setAdsPhase('idle'); setVoicePhase('idle');
    setExpandedAngles({}); setExpandedHooks({});
    const runPart = async (partName, extra) => {
      const r = await creativeApi.launch.kit({ ...base, part: partName, ...extra });
      if (!r.data?.success || !r.data.kit) throw new Error(r.data?.message || tp('Génération impossible'));
      setKit(prev => ({ ...(prev || {}), ...r.data.kit }));
      return r.data.kit;
    };
    try {
      setPhase('angles'); await runPart('angles', { angleCount });
      setAdsPhase('pending'); // débloque la proposition de stratégie Facebook Ads
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Erreur lors de la génération'));
    } finally {
      setPhase(''); setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedProduct, subject, productContext, url, language, tone, angleCount]);

  const generateAngleScript = async (angle, angleIndex) => {
    if (generatingAngle !== null) return;
    setGeneratingAngle(angleIndex); setError(''); setPhase('script');
    try {
      const r = await creativeApi.launch.kit({ ...base, part: 'scripts', selectedAngle: angle });
      const scripts = r.data?.kit?.videoScripts || [];
      if (!r.data?.success || scripts.length < 1) throw new Error(r.data?.message || tp('Génération du script impossible'));
      setKit(prev => {
        const existing = Array.isArray(prev?.videoScripts) ? prev.videoScripts : [];
        const withoutAngle = existing.filter(s => s.angleIndex !== angleIndex);
        return { ...(prev || {}), videoScripts: [...withoutAngle, ...scripts.slice(0, 3).map((script, hookIndex) => ({
          ...script, angleIndex, hookIndex, angleTitle: angle.title, hook: angle.hooks?.[hookIndex] || script.hook || '',
        }))] };
      });
      setExpandedAngles(prev => ({ ...prev, [angleIndex]: true }));
      setExpandedHooks(prev => ({ ...prev, [`${angleIndex}-0`]: true }));
      setVoicePhase('pending');
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Erreur lors de la génération du script'));
    } finally {
      setGeneratingAngle(null); setPhase('');
    }
  };

  // ── 2) STRATÉGIE FACEBOOK ADS (Andromeda) — après le texte ──
  const generateAds = async () => {
    if (!adBrief.country.trim() || adNumbers.sellingPrice <= 0 || adNumbers.purchaseCost < 0 || adNumbers.dailyBudgetUsd <= 0) {
      setError(tp('Renseignez le pays, les prix et le budget publicitaire avant de générer la stratégie.'));
      return;
    }
    if (unitMargin <= 0) {
      setError(tp('Le prix de vente doit être supérieur au coût d’achat et aux frais variables.'));
      return;
    }
    if (expectedProfitPerOrder <= 0) {
      setError(tp('Avec ce taux de livraison et ce coût d’échec, la campagne ne serait pas rentable. Ajustez les prix ou les coûts.'));
      return;
    }
    setError('');
    setLoading(true); setPhase('ads');
    try {
      const r = await creativeApi.launch.kit({
        ...base, part: 'ads', marketingAngles: kit?.angles || [],
        marketInputs: { ...adBrief, ...adNumbers, unitMargin, expectedProfitPerOrder, targetCpa, recommendedLocalDailyBudget, adSetCount: recommendedAdSetCount, adsPerAdSet: 5 },
      });
      if (r.data?.success && r.data.kit) setKit(prev => ({ ...(prev || {}), ...r.data.kit }));
    } catch (err) { setError(err.response?.data?.message || err.message || tp('Génération de la stratégie impossible.')); }
    finally { setPhase(''); setLoading(false); setAdsPhase('done'); setVoicePhase('pending'); }
  };
  const skipAds = () => { setAdsPhase('skipped'); setVoicePhase('pending'); };

  // ── 3) VOIX-OFF ──
  const generateVoice = async () => {
    const scripts = Array.isArray(kit?.videoScripts) ? kit.videoScripts : [];
    if (!scripts.length) { setVoicePhase('skipped'); return; }
    // Garde tarifaire : chaque voix off est débitée par le backend.
    const voiceCost = featureCost('voice') * scripts.length;
    if (typeof credits === 'number' && credits < voiceCost) { onNeedCredits?.(); setVoicePhase('skipped'); return; }
    setLoading(true); setPhase('voice'); setVoiceError('');
    try {
      const results = await Promise.allSettled(scripts.map(s => creativeApi.launch.voiceover({ text: s.script, referenceId: voiceRefId || undefined })));
      const vo = {};
      results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value?.data?.success && r.value.data.url) vo[i] = r.value.data.url; });
      setVoiceovers(vo);
      try { const cr = await creativeApi.credits.get(); onCreditsChange?.(cr.data?.credits ?? credits); } catch { /* noop */ }
      if (!Object.keys(vo).length) {
        const firstErr = results.find(r => r.status === 'rejected');
        if (firstErr && getInsufficientCredits(firstErr.reason)) onNeedCredits?.();
        setVoiceError(firstErr?.reason?.response?.data?.message || tp('Voix-off indisponible — vérifiez FISH_API_KEY côté backend.'));
      }
    } catch (err) {
      setVoiceError(err.response?.data?.message || err.message || tp('Voix-off indisponible.'));
    } finally {
      setPhase(''); setLoading(false); setVoicePhase('done');
    }
  };
  const skipVoice = () => setVoicePhase('skipped');

  const generateScriptVoice = async (script, scriptIndex, key) => {
    if (!script?.script || generatingVoiceKey) return;
    if (typeof credits === 'number' && credits < featureCost('voice')) { onNeedCredits?.(); return; }
    setGeneratingVoiceKey(key); setVoiceError('');
    try {
      const response = await creativeApi.launch.voiceover({ text: script.script, referenceId: voiceRefId || undefined });
      if (!response.data?.success || !response.data.url) throw new Error(response.data?.message || tp('Voix-off indisponible.'));
      setVoiceovers(prev => ({ ...prev, [scriptIndex]: response.data.url }));
      if (typeof response.data.creditsRemaining === 'number') onCreditsChange?.(response.data.creditsRemaining);
    } catch (err) {
      if (getInsufficientCredits(err)) onNeedCredits?.();
      setVoiceError(err.response?.data?.message || err.message || tp('Voix-off indisponible.'));
    } finally {
      setGeneratingVoiceKey('');
    }
  };

  // ── 4) AFFICHES ──
  const generateImages = async () => {
    if (imageCount <= 0) return;
    setLoading(true); setPhase('images'); setImageError('');
    try {
      const formats = LAUNCH_FORMATS.slice(0, imageCount);
      const fd = new FormData();
      let attached = false;
      if (productImage) {
        try { const file = await urlToFile(productImage, `${subject.slice(0, 30) || 'produit'}.png`); fd.append('productImage', file); attached = true; } catch { /* CORS */ }
      }
      if (!attached && url) fd.append('url', url);
      if (productContext) fd.append('description', productContext.slice(0, 300));
      fd.append('visualTemplate', 'listing-green');
      fd.append('quality', 'low');
      fd.append('formats', JSON.stringify(formats));
      const gr = await creativeApi.image.generate(fd);
      if (gr.data?.creditsRemaining !== undefined) onCreditsChange?.(gr.data.creditsRemaining);
      const jobId = gr.data?.jobId;
      if (jobId) setImages(await pollImages(jobId));
    } catch (imgErr) {
      if (imgErr.response?.status === 402) { setImageError(tp('Crédits insuffisants pour les affiches.')); onNeedCredits?.(); }
      else setImageError(imgErr.response?.data?.error || imgErr.message || tp('Affiches indisponibles.'));
    } finally {
      setPhase(''); setLoading(false);
    }
  };

  // Génère (ou regénère) uniquement les angles & hooks, sans toucher aux
  // affiches et voix-off déjà produites (contrairement à generateText).
  const generateAnglesOnly = useCallback(async () => {
    if (!subject) { setError(tp('Importe un produit de ta boutique, ou renseigne au moins son nom (et idéalement sa photo) ci-dessus.')); return; }
    setLoading(true); setError(''); setPhase('angles');
    try {
      const r = await creativeApi.launch.kit({ ...base, part: 'angles', angleCount });
      if (!r.data?.success || !r.data.kit) throw new Error(r.data?.message || tp('Génération impossible'));
      setKit(prev => ({ ...(prev || {}), ...r.data.kit }));
      setKitSaved(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Erreur lors de la génération'));
    } finally {
      setPhase(''); setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, productContext, url, language, tone, angleCount]);

  // ── Lancement à la carte : ne génère que les contenus choisis ──
  const startLaunch = useCallback(async () => {
    const wantsSomething = modules.text || modules.ads || modules.voice || modules.images;
    if (!wantsSomething) { setError(tp('Choisis au moins un contenu à créer.')); return; }
    setError('');

    if (modules.text) {
      await generateText(); // crée le kit (angles & hooks) et ouvre l'espace de travail
    } else {
      // Ouvrir l'espace de travail sans texte : stratégie et affiches sont autonomes
      setKit({ angles: [], videoScripts: [] });
      setImages([]); setVoiceovers({}); setKitSaved(false);
      setAdsPhase(modules.ads ? 'pending' : 'idle'); setVoicePhase('idle');
      setActiveStage(modules.ads ? 'ads' : 'images');
    }

    if (modules.images) {
      await generateImages(); // indépendant du texte
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, generateText]);

  const reset = () => {
    setKit(null); setImages([]); setVoiceovers({}); setError(''); setImageError(''); setVoiceError('');
    setKitSaved(false); setAdsPhase('idle'); setVoicePhase('idle');
    setExpandedAngles({}); setExpandedHooks({}); setGeneratingAngle(null);
    setExpandedAdSets({});
    setActiveStage('angles');
  };

  const fb = kit?.facebookAds || {};
  const campaignPlan = fb.campaignStructure || {};
  const hasAds = !!(campaignPlan.campaign || fb.strategyOverview || fb.campaignType || fb.audience || (Array.isArray(fb.primaryTexts) && fb.primaryTexts.length));

  const saveKit = async () => {
    if (!kit || savingKit || kitSaved) return;
    setSavingKit(true);
    try {
      const items = [];
      (kit.angles || []).forEach(a => items.push({
        type: 'text', label: `Angle : ${a.title || ''}`.slice(0, 120), productName: subject, meta: { kind: 'angle' },
        content: `${a.title || ''}\n${a.audience ? `Cible : ${a.audience}\n` : ''}${a.description || ''}\n\nHooks :\n${(a.hooks || []).map(h => `• ${h}`).join('\n')}`,
      }));
      (kit.videoScripts || []).forEach(s => items.push({
        type: 'text', label: `Script ${s.durationSec ? s.durationSec + 's' : ''} : ${s.title || ''}`.slice(0, 120), content: s.script || '', productName: subject, meta: { kind: 'script', durationSec: s.durationSec },
      }));
      if (hasAds) {
        const parts = [];
        if (fb.strategyOverview) parts.push(`Vue d'ensemble : ${fb.strategyOverview}`);
        AD_FIELDS.forEach(([k, label]) => { if (fb[k]) parts.push(`${label} : ${formatAdValue(fb[k])}`); });
        if (Array.isArray(fb.primaryTexts) && fb.primaryTexts.length) parts.push(`Textes d'annonce :\n${fb.primaryTexts.map(t => `• ${t}`).join('\n')}`);
        if (Array.isArray(fb.headlines) && fb.headlines.length) parts.push(`Titres :\n${fb.headlines.map(t => `• ${t}`).join('\n')}`);
        if (Array.isArray(fb.andromedaTips) && fb.andromedaTips.length) parts.push(`Astuces Andromeda :\n${fb.andromedaTips.map(t => `• ${t}`).join('\n')}`);
        items.push({ type: 'text', label: 'Stratégie Facebook Ads', content: parts.join('\n\n'), productName: subject, meta: { kind: 'facebook-ads' } });
      }
      Object.keys(voiceovers).forEach(i => items.push({ type: 'audio', label: `Voix-off ${Number(i) + 1}`, audioUrl: voiceovers[i], productName: subject, meta: { kind: 'voiceover' } }));
      (images || []).forEach((im, idx) => { const u = im?.imageUrl || im?.url; if (u) items.push({ type: 'image', label: `Affiche lancement ${idx + 1}`, imageUrl: u, productName: subject, meta: { kind: 'launch-image' } }); });

      // Enregistrement COMPLET du lancement (mode « Lancement produit J1 ») — toutes les données + dates.
      const now = new Date();
      const launchRecord = {
        productName: subject, day: 'J1',
        savedAt: now.toISOString(), launchDate: now.toISOString().slice(0, 10),
        settings: { language, tone, angleCount, imageCount, voiceRefId },
        angles: kit.angles || [],
        videoScripts: kit.videoScripts || [],
        ads: hasAds ? fb : null,
        adBrief,
        voiceovers,
        images: (images || []).map(im => im?.imageUrl || im?.url).filter(Boolean),
        counts: {
          angles: (kit.angles || []).length,
          scripts: (kit.videoScripts || []).length,
          voiceovers: Object.keys(voiceovers).length,
          images: (images || []).length,
        },
      };
      await creativeApi.gallery.save({
        type: 'launch',
        label: `Lancement produit — ${subject || tp('Produit')} — J1`.slice(0, 180),
        productName: subject,
        content: `Lancement « ${subject || tp('Produit')} » (J1) — ${launchRecord.counts.angles} angles, ${launchRecord.counts.scripts} scripts, ${launchRecord.counts.voiceovers} voix-off, ${launchRecord.counts.images} affiches. Sauvegardé le ${now.toLocaleString('fr-FR')}.`,
        meta: { kind: 'launch', day: 'J1', launchDate: launchRecord.launchDate, savedAt: launchRecord.savedAt, launch: launchRecord },
      });

      if (items.length) await creativeApi.gallery.saveMany(items);
      setKitSaved(true);
    } catch { /* best-effort */ }
    finally { setSavingKit(false); }
  };

  const phaseLabel = phase === 'angles' ? tp('Rédaction des angles & hooks…')
    : phase === 'script' ? tp('Écriture du script sélectionné…')
    : phase === 'ads' ? tp('Stratégie Facebook Ads (Andromeda)…')
    : phase === 'voice' ? tp('Génération des voix-off…')
    : phase === 'images' ? tp('Création des affiches…')
    : tp('Traitement…');

  const { fishVoices } = useFishVoices();
  const VoicePicker = () => (
    <div className="space-y-3 max-w-lg">
      {/* Voix Scalor priorisées (cartes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {VOICES.map(v => {
          const active = !customVoice && voiceRefId === v.id;
          return (
            <button key={v.id || 'default'} onClick={() => { setCustomVoice(false); setVoiceRefId(v.id); }}
              className={`text-left rounded-xl border p-2.5 transition-all ${active ? 'bg-primary/10 border-transparent ring-2 ring-primary/20' : 'bg-card border-border hover:border-gray-300'}`}>
              <div className="flex items-center gap-1.5"><Mic size={13} className={active ? 'text-primary' : 'text-muted-foreground'} /><span className={`text-[12.5px] font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{v.label}</span></div>
              {v.tag && <p className="text-[10.5px] text-muted-foreground mt-0.5">{v.tag}</p>}
            </button>
          );
        })}
        <button onClick={() => { setCustomVoice(true); setVoiceRefId(''); }}
          className={`text-left rounded-xl border p-2.5 transition-all ${customVoice ? 'bg-primary/10 border-transparent ring-2 ring-primary/20' : 'bg-card border-border hover:border-gray-300'}`}>
          <div className="flex items-center gap-1.5"><Mic size={13} className={customVoice ? 'text-primary' : 'text-muted-foreground'} /><span className={`text-[12.5px] font-semibold ${customVoice ? 'text-foreground' : 'text-muted-foreground'}`}>{tp('Autre voix')}</span></div>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">{tp('Tout le catalogue Fish')}</p>
        </button>
      </div>
      {customVoice && (
        <div className="space-y-2">
          {/* Tout le catalogue Fish Audio (proxy backend) + pré-écoute */}
          {fishVoices.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={fishVoices.some(v => v.id === voiceRefId) ? voiceRefId : ''}
                onChange={e => setVoiceRefId(e.target.value)}
                className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary/40 transition"
              >
                <option value="">{tp('— Choisir dans le catalogue Fish Audio —')}</option>
                {fishVoices.map(v => <option key={v.id} value={v.id}>{v.label}{v.tag ? ` — ${v.tag}` : ''}</option>)}
              </select>
              <VoicePreviewButton voiceId={voiceRefId} className="h-11 w-11" />
            </div>
          )}
          <input value={voiceRefId} onChange={e => setVoiceRefId(e.target.value)} placeholder={tp('…ou colle un reference_id Fish Audio')}
            className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/20 transition" />
        </div>
      )}
      {!customVoice && voiceRefId && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <VoicePreviewButton voiceId={voiceRefId} /> {tp('Écouter la voix sélectionnée')}
        </div>
      )}
    </div>
  );
  const selectedVoiceLabel = customVoice
    ? (fishVoices.find(v => v.id === voiceRefId)?.label || tp('Voix personnalisée'))
    : (VOICES.find(v => v.id === voiceRefId)?.label || tp('Voix du modèle'));

  const steps = [
    {
      title: tp('Produit'), subtitle: tp('Choisissez le produit à lancer.'), valid: !!(importedProduct?.id || subject),
      content: (
        <div className="space-y-3 max-w-xl">
          <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={A} />

          {/* Produit saisi à la main (image + nom + description) quand rien n'est importé */}
          {!importedProduct && (
            <div className="rounded-2xl border border-border bg-card p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2.5">{tp('Ou renseigne ton produit ici')}</p>
              <div className="flex flex-wrap items-start gap-3">
                <label className={`w-24 h-24 shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden ${manualImageUrl ? 'border-transparent' : 'border-border hover:border-primary/30'} ${manualImageBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                  {manualImageUrl
                    ? <img src={manualImageUrl} alt="" className="w-full h-full object-cover" />
                    : manualImageBusy
                      ? <Loader2 size={18} className="animate-spin text-muted-foreground" />
                      : <><ImageIcon size={18} className="text-muted-foreground" /><span className="mt-1 text-[10px] text-muted-foreground text-center leading-tight">{tp('Photo du produit')}</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadManualImage(e.target.files?.[0])} />
                </label>
                <div className="flex-1 min-w-[220px] space-y-2">
                  <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder={tp('Nom du produit')}
                    className="w-full h-10 rounded-xl border border-border px-3 text-[13px] outline-none focus:border-primary/40" />
                  <textarea value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} rows={3}
                    placeholder={tp('Description : bénéfices, ingrédients/composition, à qui ça s’adresse…')}
                    className="w-full rounded-xl border border-border px-3 py-2 text-[12.5px] outline-none focus:border-primary/40 resize-y" />
                </div>
              </div>
              {manualImageUrl && <button onClick={() => setManualImageUrl('')} className="mt-2 text-[11.5px] text-muted-foreground hover:text-red-500">{tp('Retirer la photo')}</button>}
            </div>
          )}
          {!importedProduct?.id && !subject && <p className="text-[12px] text-muted-foreground">{tp('Importe un produit de ta boutique, ou renseigne son nom, sa photo et sa description ci-dessus.')}</p>}
        </div>
      ),
    },
    {
      title: tp('Contenus'), subtitle: tp('Choisis ce que tu veux créer — aucun ordre imposé, tout reste accessible ensuite.'), valid: modules.text || modules.ads || modules.voice || modules.images,
      content: (
        <div className="space-y-5 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'text', icon: Target, label: tp('Texte : angles & scripts'), desc: tp('Angles marketing, hooks et scripts vidéo.') },
              { id: 'ads', icon: Megaphone, label: tp('Stratégie Facebook Ads'), desc: tp('Structure de campagne calculée et rentable.') },
              { id: 'images', icon: ImageIcon, label: tp('Affiches'), desc: tp('Visuels publicitaires prêts à poster.') },
              { id: 'voice', icon: Mic, label: tp('Voix-off'), desc: tp('Narration audio des scripts (active aussi le texte).') },
            ].map(m => {
              const Icon = m.icon; const on = !!modules[m.id];
              return (
                <button key={m.id} type="button" onClick={() => toggleModule(m.id)} aria-pressed={on}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${on ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/25' : 'border-border bg-card hover:border-primary/20'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-foreground">{m.label}</span>
                    <span className="block text-[11.5px] text-muted-foreground mt-0.5">{m.desc}</span>
                  </span>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${on ? 'bg-primary border-primary text-white' : 'border-border text-transparent'}`}><Check size={12} /></span>
                </button>
              );
            })}
          </div>

          {modules.text && (
            <div>
              <span className="text-[13px] font-semibold text-foreground block mb-2">{tp('Angles marketing')}</span>
              <Stepper value={angleCount} setValue={setAngleCount} min={1} max={10} />
              <p className="text-[11px] text-muted-foreground mt-1.5">{tp('3 hooks par angle. Vous choisissez ensuite les scripts à générer.')}</p>
            </div>
          )}
          {modules.images && (
            <div>
              <span className="text-[13px] font-semibold text-foreground block mb-2">{tp("Nombre d'affiches")}</span>
              <div className="inline-flex bg-muted rounded-xl p-1">
                {IMAGE_CHOICES.map(n => <button key={n} onClick={() => setImageCount(n)} className={`h-8 px-4 rounded-lg text-[12px] font-bold transition-all ${imageCount === n ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>{n}</button>)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{imageCount} {tp('crédit(s)')}</p>
            </div>
          )}
          <div>
            <span className="text-[13px] font-semibold text-foreground block mb-2">{tp('Ton')}</span>
            <div className="flex flex-wrap gap-1.5">{TONES.map(t => <ChoiceChip key={t.id} active={tone === t.id} onClick={() => setTone(t.id)} accent={A}>{t.label}</ChoiceChip>)}</div>
          </div>
          <div>
            <span className="text-[13px] font-semibold text-foreground block mb-2">{tp('Langue')}</span>
            <div className="inline-flex bg-muted rounded-xl p-1">
              {LANGS.map(l => <button key={l.id} onClick={() => setLanguage(l.id)} className={`h-8 px-4 rounded-lg text-[12px] font-bold transition-all ${language === l.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>{l.label}</button>)}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <StudioHeader icon={Rocket} kind="launch" title={tp('Lancement produit')}
        subtitle={tp('Texte, stratégie Facebook Ads, voix-off et affiches — choisis ce que tu veux, dans l’ordre que tu veux.')}
        right={
          <button onClick={onNeedCredits} className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[13px] font-semibold hover:bg-primary/12 transition-colors">
            <Wallet size={14} /> {credits ?? '—'}
          </button>
        } />

      {error && <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm"><AlertCircle size={16} className="shrink-0" /> {error}</div>}

      {loading && !kit ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-card shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10"><Loader2 size={22} className="animate-spin text-primary" /></div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-slate-900">{phaseLabel}</p>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">{subject || tp('Préparation de votre lancement produit')}</p>
              </div>
            </div>
            <div role="progressbar" aria-label={phaseLabel} aria-valuetext={tp('Génération en cours')} className="h-2.5 overflow-hidden rounded-full bg-primary/12">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary via-primary to-primary-700" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11.5px] font-medium">
              <span className="text-primary">{tp('Analyse du produit et création des angles')}</span>
              <span className="shrink-0 text-slate-400">{tp('Quelques instants…')}</span>
            </div>
          </div>
        </div>
      ) : kit ? (
        <div className="space-y-6">
          {/* Barre d'état */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {loading ? <><Loader2 size={15} className="text-primary animate-spin" /><span className="text-[13px] text-muted-foreground">{phaseLabel}</span></>
                : <><Check size={16} className="text-primary" /><span className="text-[13px] font-semibold text-foreground">{kit.angles?.length > 0 ? tp('Texte prêt') : tp('Lancement prêt')}</span></>}
            </div>
            {!loading && (
              <div className="flex items-center gap-2">
                <button onClick={saveKit} disabled={savingKit || kitSaved}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary-700 disabled:opacity-60">
                  {kitSaved ? <><Check size={13} /> {tp('Enregistré')}</> : savingKit ? <><Loader2 size={13} className="animate-spin" /> {tp('Enregistrement…')}</> : <><Bookmark size={13} /> {tp('Enregistrer le kit')}</>}
                </button>
                <button onClick={reset} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-[13px] font-medium hover:bg-background"><RotateCcw size={13} /> {tp('Nouveau')}</button>
              </div>
            )}
          </div>
          {loading && (
            <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm" role="status" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-bold text-primary">{phaseLabel}</span>
                <span className="text-[11px] font-medium text-slate-400">{tp('Génération en cours…')}</span>
              </div>
              <div role="progressbar" aria-label={phaseLabel} aria-valuetext={tp('Génération en cours')} className="h-2.5 overflow-hidden rounded-full bg-primary/12">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary via-primary to-primary-700" />
              </div>
              <p className="mt-2 text-[11.5px] text-slate-500">{phase === 'angles' ? tp('Analyse du produit et rédaction de 3 hooks par angle…') : tp('Traitement de votre contenu…')}</p>
            </div>
          )}

          <nav aria-label={tp('Étapes du lancement')} className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1.5 lg:grid-cols-4">
            {[
              { id: 'angles', label: tp('Angles & scripts'), icon: Target, meta: `${kit.angles?.length || 0} angles`, enabled: true },
              { id: 'ads', label: tp('Stratégie publicitaire'), icon: Megaphone, meta: hasAds ? tp('Prête') : tp('À générer'), enabled: true },
              { id: 'voice', label: tp('Voix-off'), icon: Mic, meta: (kit.videoScripts?.length || 0) > 0 ? `${Object.keys(voiceovers).length}/${kit.videoScripts?.length || 0}` : tp('Après les scripts'), enabled: (kit.videoScripts?.length || 0) > 0 },
              { id: 'images', label: tp('Affiches'), icon: ImageIcon, meta: `${images.length}/${imageCount}`, enabled: true },
            ].map(item => {
              const Icon = item.icon; const active = activeStage === item.id;
              return (
                <button key={item.id} type="button" disabled={!item.enabled} onClick={() => setActiveStage(item.id)}
                  className={`flex min-h-14 items-center gap-2.5 rounded-xl px-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'bg-card text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-card/70'}`}>
                  <Icon size={17} className="shrink-0" />
                  <span className="min-w-0"><span className="block truncate text-[12px] font-bold">{item.label}</span><span className="block text-[10.5px] text-slate-400">{item.meta}</span></span>
                </button>
              );
            })}
          </nav>

          {activeStage === 'voice' && kit.videoScripts?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary"><Mic size={17} /></span>
                <div>
                  <h3 className="text-[13.5px] font-bold text-slate-900">{tp('Voix des scripts')}</h3>
                  <p className="text-[11.5px] text-slate-500">{tp('Choisissez la voix utilisée pour les prochaines voix-off.')}</p>
                </div>
              </div>
              <VoicePicker />
            </section>
          )}

          {/* Angles + hooks — état vide si le texte n'a pas (encore) été généré */}
          {activeStage === 'angles' && !(kit.angles?.length > 0) && !loading && (
            <section className="bg-card rounded-3xl border border-border shadow-sm p-5 max-w-lg">
              <div className="flex items-center gap-2 mb-1"><Target size={16} className="text-primary" /><h3 className="text-[14px] font-bold text-foreground">{tp('Texte : angles & scripts')}</h3></div>
              <p className="text-[12.5px] text-muted-foreground mb-4">{tp('Pas encore de texte pour ce lancement. Génère les angles marketing quand tu veux — les affiches et la stratégie déjà créées sont conservées.')}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-[12px] font-semibold text-foreground block mb-1.5">{tp('Angles marketing')}</span>
                  <Stepper value={angleCount} setValue={setAngleCount} min={1} max={10} />
                </div>
                <button onClick={generateAnglesOnly} className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-primary-700"><Target size={15} /> {tp('Générer les angles & hooks')}</button>
              </div>
            </section>
          )}
          {activeStage === 'angles' && kit.angles?.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-foreground mb-3"><Target size={16} className="text-primary" /> {tp('Angles marketing & hooks')}</h3>
              <div className="space-y-3">
                {kit.angles.map((a, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
                    <button type="button" onClick={() => setExpandedAngles(prev => ({ ...prev, [i]: !prev[i] }))}
                      aria-expanded={!!expandedAngles[i]}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-sm font-bold text-primary">{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-bold text-slate-900">{a.title}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-medium text-slate-500"><Users size={12} /> {a.audience || tp('Audience produit')} · 3 hooks</span>
                      </span>
                      {kit.videoScripts?.some(s => s.angleIndex === i) && <span className="hidden sm:inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10.5px] font-bold text-primary">3 scripts prêts</span>}
                      <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${expandedAngles[i] ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedAngles[i] && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <p className="max-w-3xl text-[12.5px] leading-relaxed text-slate-600">{a.description}</p>
                          <Copyable text={`${a.title}\n${(a.hooks || []).join('\n')}\n${a.description || ''}`} className="shrink-0" />
                        </div>

                        <div className="space-y-2">
                          {(a.hooks || []).slice(0, 3).map((hook, hi) => {
                            const key = `${i}-${hi}`;
                            const script = kit.videoScripts?.find(s => s.angleIndex === i && s.hookIndex === hi);
                            const scriptIndex = kit.videoScripts?.findIndex(s => s.angleIndex === i && s.hookIndex === hi) ?? -1;
                            return (
                              <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-card">
                                <button type="button" onClick={() => setExpandedHooks(prev => ({ ...prev, [key]: !prev[key] }))}
                                  aria-expanded={!!expandedHooks[key]}
                                  className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
                                  <span className="rounded-lg bg-primary/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-primary">Hook {hi + 1}</span>
                                  <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-slate-800">{hook}</span>
                                  {script && <FileText size={15} className="shrink-0 text-primary" />}
                                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-200 ${expandedHooks[key] ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedHooks[key] && (
                                  <div className="border-t border-slate-100 px-4 py-3">
                                    {script ? (
                                      <div>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Script publicitaire · {script.durationSec || 45}s{script.framework ? ` · ${script.framework}` : ''}</span>
                                          <Copyable text={script.script} />
                                        </div>
                                        <p className="whitespace-pre-wrap text-[13px] leading-6 text-slate-700">{script.script}</p>
                                        {onSendToMontage && (
                                          <div className="mt-3 flex gap-2">
                                            <button onClick={() => onSendToMontage({
                                              productName: subject,
                                              productImage,
                                              productContext,
                                              angleTitle: script.angleTitle || a.title,
                                              scenes: buildMontageScenes(script),
                                              images: (images || []).map(im => im?.imageUrl || im?.url).filter(Boolean),
                                              voiceoverUrl: voiceovers[scriptIndex] || '',
                                            })}
                                              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 text-[12.5px] font-bold text-primary transition-colors hover:bg-primary/12 focus:outline-none focus:ring-4 focus:ring-primary/20">
                                              <Clapperboard size={15} /> {tp('Ouvrir dans le studio')}
                                            </button>
                                          </div>
                                        )}
                                        {!voiceovers[scriptIndex] && (
                                          <button onClick={() => generateScriptVoice(script, scriptIndex, key)} disabled={!!generatingVoiceKey}
                                            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 text-[12.5px] font-bold text-primary transition-colors hover:bg-primary/12 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50">
                                            {generatingVoiceKey === key
                                              ? <><Loader2 size={15} className="animate-spin" /> {tp('Génération de la voix-off…')}</>
                                              : <><Mic size={15} /> {tp('Générer avec')} {selectedVoiceLabel}</>}
                                          </button>
                                        )}
                                        {voiceovers[scriptIndex] && (
                                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                                            <Mic size={14} className="shrink-0 text-primary" />
                                            <audio src={voiceovers[scriptIndex]} controls className="h-8 min-w-0 flex-1" />
                                            <button onClick={() => generateScriptVoice(script, scriptIndex, key)} disabled={!!generatingVoiceKey} aria-label={tp('Regénérer la voix-off')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-card text-primary hover:bg-primary/12 disabled:opacity-50"><RotateCcw size={13} /></button>
                                            <button onClick={() => downloadFile(voiceovers[scriptIndex], `voix-off-angle-${i + 1}-hook-${hi + 1}.mp3`)} aria-label={tp('Télécharger la voix-off')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-700"><Download size={13} /></button>
                                          </div>
                                        )}
                                      </div>
                                    ) : <p className="text-[12px] text-slate-400">{tp('Le script de ce hook sera affiché ici après génération.')}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {generatingAngle === i && (
                          <div className="mt-4" role="status" aria-live="polite">
                            <div className="mb-2 flex items-center justify-between text-[11.5px] font-semibold text-primary"><span>{tp('Création des 3 scripts en cours…')}</span><span>{tp('Analyse des hooks')}</span></div>
                            <div className="h-2 overflow-hidden rounded-full bg-primary/12"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary to-primary-700" /></div>
                          </div>
                        )}

                        <button onClick={() => generateAngleScript(a, i)} disabled={generatingAngle !== null}
                          className="mt-4 min-h-11 w-full rounded-xl bg-primary px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50">
                          {generatingAngle === i ? tp('Génération des scripts…') : kit.videoScripts?.some(s => s.angleIndex === i) ? tp('Regénérer les 3 scripts') : tp('Générer un script pour chaque hook')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeStage === 'voice' && voiceError && <p className="text-[12px] text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">{voiceError}</p>}

          {/* ── Stratégie Facebook Ads : brief conversationnel (chat) ── */}
          {activeStage === 'ads' && !hasAds && !loading && (
            <section className="bg-card rounded-3xl border border-primary/20 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1"><Megaphone size={16} className="text-primary" /><h3 className="text-[14px] font-bold text-foreground">{tp('Stratégie Facebook Ads')}</h3></div>
              <p className="text-[12.5px] text-muted-foreground mb-4">{tp('Réponds aux questions — la structure réaliste et rentable est calculée à partir de tes chiffres.')}</p>
              <AdsBriefChat
                adBrief={adBrief}
                adNumbers={adNumbers}
                metrics={{ unitMargin, expectedProfitPerOrder, targetCpa, recommendedLocalDailyBudget, recommendedAdSetCount }}
                onAnswer={(field, value) => setAdBrief(prev => ({ ...prev, [field]: value }))}
                onGenerate={generateAds}
                onSkip={skipAds}
              />
            </section>
          )}

          {/* Stratégie Facebook Ads détaillée */}
          {activeStage === 'ads' && hasAds && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[14px] font-bold text-foreground"><Megaphone size={16} className="text-primary" /> {tp('Stratégie Facebook Ads')}<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-primary/12 text-primary px-1.5 py-0.5 rounded-full"><Zap size={9} /> Andromeda</span></h3>
                <button onClick={() => { setKit(prev => { const next = { ...(prev || {}) }; delete next.facebookAds; return next; }); setAdsPhase('pending'); }} className="min-h-9 rounded-lg border border-slate-200 bg-card px-3 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50">{tp('Modifier le budget')}</button>
              </div>
              <div className="bg-card rounded-2xl border shadow-sm p-4 space-y-4">
                {fb.strategyOverview && (
                  <div className="rounded-xl bg-primary/10/60 border border-primary/20 px-3.5 py-3">
                    <p className="text-[13px] text-primary leading-snug whitespace-pre-wrap">{formatAdValue(fb.strategyOverview)}</p>
                  </div>
                )}

                {campaignPlan.campaign && (
                  <div className="rounded-2xl border border-primary/25 bg-slate-50 p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{tp('Campagne')}</span><span>›</span><span>{tp('Ensembles de publicités')}</span><span>›</span><span>{tp('Publicités')}</span>
                    </div>

                    <div className="rounded-xl border border-primary/25 bg-card shadow-sm">
                      <div className="flex items-start gap-3 p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><FolderKanban size={19} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">{tp('Campagne')}</p>
                          <h4 className="mt-0.5 text-[14px] font-bold text-slate-900">{campaignPlan.campaign.name}</h4>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[campaignPlan.campaign.objective, campaignPlan.campaign.buyingType, campaignPlan.campaign.budgetMode, campaignPlan.campaign.dailyBudget].filter(Boolean).map((value, index) => <span key={index} className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600">{formatAdValue(value)}</span>)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-5 border-l-2 border-primary/25 pl-4 pt-3 sm:ml-8 sm:pl-6">
                      <div className="space-y-3">
                        {(campaignPlan.adSets || []).map((adSet, adSetIndex) => {
                          const open = !!expandedAdSets[adSetIndex];
                          return (
                            <div key={adSetIndex} className="relative rounded-xl border border-primary/25 bg-card shadow-sm before:absolute before:-left-[26px] before:top-7 before:h-0.5 before:w-6 before:bg-primary/15 sm:before:-left-[34px] sm:before:w-8">
                              <button type="button" onClick={() => setExpandedAdSets(prev => ({ ...prev, [adSetIndex]: !prev[adSetIndex] }))} aria-expanded={open}
                                className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><Layers3 size={17} /></span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-primary">{tp('Ensemble de publicités')} {String(adSetIndex + 1).padStart(2, '0')}</span>
                                  <span className="block truncate text-[13px] font-bold text-slate-900">{adSet.name || adSet.angle}</span>
                                  <span className="mt-0.5 block text-[10.5px] text-slate-500">{(adSet.ads || []).length} publicités · {formatAdValue(adSet.dailyBudget) || tp('Budget à définir')}</span>
                                </span>
                                <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                              </button>

                              {open && (
                                <div className="border-t border-slate-100 bg-slate-50/70 p-3.5">
                                  <div className="mb-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
                                    <p><span className="font-bold text-slate-800">{tp('Audience')} :</span> {formatAdValue(adSet.audience)}</p>
                                    <p><span className="font-bold text-slate-800">{tp('Optimisation')} :</span> {formatAdValue(adSet.optimization)} · {formatAdValue(adSet.placements)}</p>
                                  </div>
                                  <div className="space-y-2 border-l-2 border-primary/25 pl-3">
                                    {(adSet.ads || []).map((ad, adIndex) => (
                                      <div key={adIndex} className="relative rounded-xl border border-slate-200 bg-card p-3 before:absolute before:-left-[14px] before:top-6 before:h-0.5 before:w-3 before:bg-primary/15">
                                        <div className="flex items-start gap-2.5">
                                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"><MousePointerClick size={15} /></span>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                              <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">{tp('Publicité')} {String(adIndex + 1).padStart(2, '0')} · {ad.format}</p><p className="text-[12.5px] font-bold text-slate-900">{ad.name}</p></div>
                                              <Copyable text={`${formatAdValue(ad.hook)}\n\n${formatAdValue(ad.primaryText)}\n\n${formatAdValue(ad.headline)}\nCTA: ${formatAdValue(ad.cta)}`} />
                                            </div>
                                            <p className="mt-2 rounded-lg bg-primary/10 px-2.5 py-2 text-[11.5px] font-semibold text-primary">Hook : {formatAdValue(ad.hook)}</p>
                                            <p className="mt-2 text-[12px] leading-relaxed text-slate-600 whitespace-pre-wrap">{formatAdValue(ad.primaryText)}</p>
                                            <div className="mt-2 grid gap-2 sm:grid-cols-2"><p className="text-[11px] text-slate-500"><span className="font-bold text-slate-700">{tp('Direction créative')} :</span> {formatAdValue(ad.creativeDirection)}</p><p className="text-[11px] text-slate-500"><span className="font-bold text-slate-700">{tp('Titre')} :</span> {formatAdValue(ad.headline)} · <span className="font-bold text-primary">{formatAdValue(ad.cta)}</span></p></div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <details className="rounded-xl border border-slate-200 bg-card" open={!campaignPlan.campaign}>
                  <summary className="cursor-pointer list-none px-3.5 py-3 text-[12px] font-bold text-slate-700">{tp('Recommandations et paramètres détaillés')}</summary>
                  <div className="border-t border-slate-100 p-3.5">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  {AD_FIELDS.filter(([k]) => fb[k]).map(([k, label]) => (
                    <div key={k}>
                      <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><Copyable text={formatAdValue(fb[k])} /></div>
                      <p className="text-[13px] text-foreground mt-0.5 leading-snug whitespace-pre-wrap">{formatAdValue(fb[k])}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(fb.primaryTexts) && fb.primaryTexts.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{tp('Textes d\'annonce')}</p>
                    <div className="space-y-1.5">
                      {fb.primaryTexts.map((t, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-background px-2.5 py-1.5">
                          <p className="text-[12.5px] text-foreground min-w-0 whitespace-pre-wrap">{formatAdValue(t)}</p><Copyable text={formatAdValue(t)} className="shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(fb.headlines) && fb.headlines.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{tp('Titres')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {fb.headlines.map((t, i) => <span key={i} className="text-[12px] text-foreground bg-background border border-border px-2 py-1 rounded-lg">{formatAdValue(t)}</span>)}
                    </div>
                  </div>
                )}
                {Array.isArray(fb.andromedaTips) && fb.andromedaTips.length > 0 && (
                  <div className="rounded-xl bg-gray-900 text-white p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2 flex items-center gap-1.5"><Zap size={11} /> {tp('Astuces Andromeda')}</p>
                    <ul className="space-y-1.5">
                      {fb.andromedaTips.map((t, i) => <li key={i} className="text-[12.5px] text-white/80 flex gap-2"><span className="text-primary">•</span> {formatAdValue(t)}</li>)}
                    </ul>
                  </div>
                )}
                  </div>
                </details>
              </div>
            </section>
          )}

          {/* ── Voix-off : disponible dès qu'un script existe ── */}
          {activeStage === 'voice' && kit.videoScripts?.length > 0 && Object.keys(voiceovers).length === 0 && !loading && (
            <section className="bg-card rounded-3xl border border-primary/20 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1"><Mic size={16} className="text-primary" /><h3 className="text-[14px] font-bold text-foreground">{tp('Voix-off')}</h3></div>
              <p className="text-[12.5px] text-muted-foreground mb-4">{tp('Une narration audio par script vidéo (Fish Audio).')}</p>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={generateVoice} className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-primary-700"><Mic size={15} /> {tp('Générer les voix-off')}</button>
                <button onClick={skipVoice} className="h-10 px-4 rounded-xl border border-border text-muted-foreground text-[13px] font-medium hover:bg-background">{tp('Plus tard')}</button>
              </div>
            </section>
          )}

          {/* ── Palier : Affiches (après la voix) ── */}
          {activeStage === 'images' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-[14px] font-bold text-foreground"><ImageIcon size={16} className="text-primary" /> {tp('Affiches')}{phase === 'images' && <Loader2 size={13} className="text-primary animate-spin" />}</h3>
                {images.length > 0 && <Link to="/ecom/creatives?tab=galerie" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary">{tp('Galerie')} <ExternalLink size={13} /></Link>}
              </div>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map((c) => (
                    <div key={c.id} className="group bg-card rounded-2xl border overflow-hidden shadow-sm">
                      <div className="aspect-square bg-background relative overflow-hidden">
                        <img src={c.imageUrl} alt={c.label} className="w-full h-full object-cover" loading="lazy" />
                        <button onClick={() => downloadFile(c.imageUrl, `${c.id}.png`)} className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="w-9 h-9 rounded-xl bg-card flex items-center justify-center text-foreground"><Download size={15} /></span>
                        </button>
                      </div>
                      <div className="p-2.5"><p className="text-[12px] font-semibold text-foreground truncate">{c.label}</p></div>
                    </div>
                  ))}
                </div>
              ) : imageError ? (
                <p className="text-[12px] text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">{imageError}</p>
              ) : phase === 'images' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{Array.from({ length: Math.min(6, imageCount) }).map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-background animate-pulse" />)}</div>
              ) : !loading ? (
                <div className="bg-card rounded-3xl border border-border shadow-sm p-5 max-w-lg">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-[13px] font-semibold text-foreground block mb-2">{tp('Nombre d\'affiches')}</span>
                      <div className="inline-flex bg-muted rounded-xl p-1">
                        {IMAGE_CHOICES.map(n => (
                          <button key={n} onClick={() => setImageCount(n)} className={`h-8 px-4 rounded-lg text-[12px] font-bold transition-all ${imageCount === n ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>{n}</button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">{imageCount} {tp('crédit(s)')} · {tp('Solde')} : {credits ?? '—'}</p>
                    </div>
                    <button onClick={generateImages} className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-primary-700"><ImageIcon size={15} /> {tp('Générer les affiches')} <CostChip cost={imageCount * featureCost('image')} /></button>
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </div>
      ) : (
        <Wizard accent={A} steps={steps} finalLabel={tp('Lancer la création')} cost={modules.images ? imageCount * featureCost('image') : 0} busyLabel={tp('Génération…')} onFinish={startLaunch} loading={loading} />
      )}
    </div>
  );
};

export default LaunchStudio;
