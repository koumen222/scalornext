import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import {
  Sparkles, Target, Zap, List, Shield, Scale, Users, Image as ImageIcon,
  Upload, X, Link2, Loader2, Download, Copy, Check, ExternalLink,
  ChevronDown, AlertCircle, Wallet, CheckCircle, Layers, Package, RotateCcw,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, Field, downloadFile, ImportProductBar, stripHtml, urlToFile } from './creativeShared.jsx';
import Wizard from './Wizard.jsx';

const A = ACCENTS.image;

const FORMATS = [
  { id: 'hero-benefits',    label: tp('Bénéfices'),     icon: Sparkles, desc: tp('Produit + bénéfices clés') },
  { id: 'target-promise',   label: tp('Cible & Promesse'), icon: Target, desc: tp('Lifestyle + transformation') },
  { id: 'problem-solution', label: tp('Prob. / Solution'), icon: Zap,   desc: tp('Avant / Après split') },
  { id: 'how-to-use',       label: tp("Mode d'emploi"),  icon: List,    desc: tp('3 étapes simples') },
  { id: 'ingredients-trust',label: tp('Confiance'),      icon: Shield,  desc: tp('Badges & certifications') },
  { id: 'comparison',       label: tp('Comparaison'),    icon: Scale,   desc: tp('Tableau ✓ / ✗') },
  { id: 'social-proof',     label: tp('Preuve Sociale'), icon: Users,   desc: tp('Avis clients') },
];

const TEMPLATES = [
  { id: 'listing-green', title: tp('Listing'), color: 'from-primary to-primary-700' },
  { id: 'general',       title: 'Premium',     color: 'from-gray-700 to-gray-900' },
  { id: 'beauty',        title: tp('Beauté'),  color: 'from-primary to-primary-700' },
  { id: 'health',        title: tp('Santé'),   color: 'from-primary to-primary-700' },
  { id: 'tech',          title: 'Tech',        color: 'from-primary to-primary-700' },
  { id: 'fashion',       title: tp('Mode'),    color: 'from-primary to-primary-700' },
  { id: 'home',          title: tp('Maison'),  color: 'from-primary to-primary-700' },
];

const QUALITIES = [
  { id: 'low', label: tp('Éco') },
  { id: 'medium', label: tp('Standard') },
  { id: 'high', label: 'HD' },
];

const JOB_STORAGE_KEY = 'creativeGenJobId';
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_MS = 10 * 60 * 1000;

const ImageStudio = ({ credits, onCreditsChange, onNeedCredits, importedProduct, onImport, onClearImport }) => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [visualTemplate, setVisualTemplate] = useState('listing-green');
  const [imageQuality, setImageQuality] = useState('low');
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedFormats, setSelectedFormats] = useState(FORMATS.map(f => f.id));
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (!importedProduct?.id) return;
    setUrl(importedProduct.url || '');
    setDescription(prev => prev || stripHtml(importedProduct.description).slice(0, 300));
    setError('');
    (async () => {
      if (!importedProduct.imageUrl) return;
      try {
        const file = await urlToFile(importedProduct.imageUrl, `${(importedProduct.name || 'produit').slice(0, 40)}.png`);
        setProductImage(file); setImagePreview(URL.createObjectURL(file));
      } catch { setProductImage(null); setImagePreview(importedProduct.imageUrl); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedProduct?.id]);

  const toggleFormat = (id) => setSelectedFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tp('Sélectionnez une image')); return; }
    if (file.size > 10 * 1024 * 1024) { setError(tp('Image trop lourde (max 10 MB)')); return; }
    setProductImage(file); setImagePreview(URL.createObjectURL(file)); setError('');
  };
  const removeImage = () => {
    setProductImage(null);
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tp('Sélectionnez une image pour le logo')); return; }
    if (file.size > 5 * 1024 * 1024) { setError(tp('Logo trop lourd (max 5 MB)')); return; }
    setLogoImage(file); setLogoPreview(URL.createObjectURL(file)); setError('');
  };
  const removeLogo = () => {
    setLogoImage(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const canGenerate = !!(productImage || url.trim());

  const pollJob = useCallback(async (jobId) => {
    const startedAt = Date.now();
    while (true) {
      if (Date.now() - startedAt > POLL_MAX_MS) throw new Error(tp("La génération prend plus de temps que prévu — retrouvez vos visuels dans « Galerie » d'ici quelques minutes."));
      let job;
      try { const res = await creativeApi.image.job(jobId); job = res.data?.job; }
      catch (err) {
        if (err.response?.status === 404) throw new Error(err.response?.data?.message || tp('Suivi perdu — vos visuels déjà générés sont dans « Galerie ».'));
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS)); continue;
      }
      if (!job) { await new Promise(r => setTimeout(r, POLL_INTERVAL_MS)); continue; }
      if (job.step === 'analysis' || job.step === 'queued') setCurrentStep(1);
      else if (job.step === 'generating') setCurrentStep(2);
      if (job.status === 'done') return job.result;
      if (job.status === 'error') {
        const partial = (job.creatives || []).some(c => c.imageUrl);
        throw new Error(job.error + (partial ? tp(' — les visuels réussis sont dans « Galerie ».') : ''));
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }, []);

  const runJobToCompletion = useCallback(async (jobId) => {
    try {
      const finalResult = await pollJob(jobId);
      setResult(finalResult);
      if (finalResult?.creditsRemaining !== undefined) onCreditsChange?.(finalResult.creditsRemaining);
    } catch (err) { setError(err.message || tp('Erreur lors de la génération')); }
    finally { try { sessionStorage.removeItem(JOB_STORAGE_KEY); } catch { /* noop */ } setLoading(false); setCurrentStep(0); }
  }, [pollJob, onCreditsChange]);

  useEffect(() => {
    let jobId = null;
    try { jobId = sessionStorage.getItem(JOB_STORAGE_KEY); } catch { /* noop */ }
    if (!jobId) return;
    setLoading(true); setError(''); setCurrentStep(1);
    runJobToCompletion(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async () => {
    if (!canGenerate) { setError(tp('Ajoutez une image produit ou un lien.')); return; }
    setLoading(true); setError(''); setResult(null); setCurrentStep(1);
    try {
      const formData = new FormData();
      if (productImage) formData.append('productImage', productImage);
      if (logoImage) formData.append('logoImage', logoImage);
      if (url.trim()) formData.append('url', url.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('visualTemplate', visualTemplate);
      formData.append('quality', imageQuality);
      formData.append('formats', JSON.stringify(selectedFormats.length > 0 ? selectedFormats : undefined));
      const res = await creativeApi.image.generate(formData);
      const jobId = res.data?.jobId;
      if (!jobId) throw new Error(res.data?.error || tp('Réponse serveur invalide'));
      if (res.data.creditsRemaining !== undefined) onCreditsChange?.(res.data.creditsRemaining);
      try { sessionStorage.setItem(JOB_STORAGE_KEY, jobId); } catch { /* noop */ }
      await runJobToCompletion(jobId);
    } catch (err) {
      const errData = err.response?.data;
      if (err.response?.status === 402) { setError(errData?.error || tp('Crédits insuffisants')); onNeedCredits?.(); }
      else setError(errData?.error || err.message || tp('Erreur lors de la génération'));
      setLoading(false); setCurrentStep(0);
    }
  }, [url, description, productImage, logoImage, selectedFormats, visualTemplate, imageQuality, canGenerate, runJobToCompletion, onCreditsChange, onNeedCredits]);

  const copyUrl = (imageUrl, id) => { navigator.clipboard.writeText(imageUrl); setCopiedId(id); setTimeout(() => setCopiedId(null), 1800); };
  const reset = () => { setResult(null); setError(''); };

  const cost = selectedFormats.length;
  const insufficient = credits !== null && credits !== undefined && credits < cost;

  const steps = [
    {
      title: tp('Source'), subtitle: tp('Une image produit, ou un lien de page produit.'), valid: canGenerate,
      content: (
        <div className="space-y-4 max-w-xl">
          <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={A} />
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <img src={imagePreview} alt="produit" className="w-full h-48 object-contain bg-background" />
              <button onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-card/90 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-red-500 shadow-sm"><X size={15} /></button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-border hover:border-primary-300 hover:bg-primary-50/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="w-11 h-11 rounded-2xl bg-background flex items-center justify-center"><Upload size={18} /></div>
              <span className="text-[13px] font-medium text-muted-foreground">{tp('Importer une image')}</span>
              <span className="text-[11px]">{tp('PNG / JPG · max 10 MB')}</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-muted" /><span className="text-[11px] font-medium text-gray-300 uppercase tracking-wide">{tp('ou')}</span><div className="flex-1 h-px bg-muted" />
          </div>
          <Field label={tp('Lien de la page produit')}>
            <div className="relative">
              <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition" />
            </div>
          </Field>
          <Field label={tp('Précisions')} hint={tp('optionnel')}>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={tp('Offre, promo, angle à mettre en avant…')}
              className="w-full px-3.5 py-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition resize-none" />
          </Field>
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <div className="relative">
                <img src={logoPreview} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-background border border-border" />
                <button onClick={removeLogo} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center"><X size={11} /></button>
              </div>
            ) : (
              <button onClick={() => logoInputRef.current?.click()} className="w-12 h-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-gray-300 hover:border-gray-300"><Plus /></button>
            )}
            <div><p className="text-[13px] font-semibold text-foreground">{tp('Logo de marque')}</p><p className="text-[11px] text-muted-foreground">{tp('Ajouté sur les visuels · optionnel')}</p></div>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          </div>
        </div>
      ),
    },
    {
      title: tp('Style'), subtitle: tp('Choisissez l\'ambiance visuelle.'), valid: true,
      content: (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 max-w-3xl">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setVisualTemplate(t.id)}
              className={`relative rounded-xl overflow-hidden aspect-[4/3] ring-2 transition-all ${visualTemplate === t.id ? 'ring-primary-500' : 'ring-transparent hover:ring-gray-200'}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${t.color}`} />
              <span className="absolute inset-x-0 bottom-0 text-[10px] font-bold text-white/95 py-1 bg-black/15 text-center">{t.title}</span>
              {visualTemplate === t.id && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-card flex items-center justify-center"><Check size={10} className="text-primary" /></span>}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: tp('Formats'), subtitle: tp('Sélectionnez les visuels à générer (1 crédit chacun).'), valid: selectedFormats.length > 0,
      content: (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-muted-foreground">{selectedFormats.length}/{FORMATS.length} {tp('sélectionnés')}</span>
            <button onClick={() => setSelectedFormats(selectedFormats.length === FORMATS.length ? [] : FORMATS.map(f => f.id))} className="text-[12px] font-medium text-primary hover:text-primary">
              {selectedFormats.length === FORMATS.length ? tp('Tout désélectionner') : tp('Tout sélectionner')}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FORMATS.map(f => {
              const Icon = f.icon; const active = selectedFormats.includes(f.id);
              return (
                <button key={f.id} onClick={() => toggleFormat(f.id)}
                  className={`text-left rounded-xl border p-3 transition-all ${active ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-card border-border hover:border-gray-300'}`}>
                  <div className="flex items-center gap-1.5"><Icon size={15} className={active ? A.text : 'text-muted-foreground'} /><span className={`text-[12.5px] font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{f.label}</span></div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      title: tp('Qualité'), subtitle: tp('Dernière étape avant génération.'), valid: true,
      content: (
        <div className="space-y-4 max-w-md">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">{tp('Qualité des images')}</span>
            <div className="inline-flex bg-muted rounded-xl p-1">
              {QUALITIES.map(q => (
                <button key={q.id} onClick={() => setImageQuality(q.id)} className={`h-8 px-3.5 rounded-lg text-[12px] font-semibold transition-all ${imageQuality === q.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>{q.label}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-primary-50/60 border border-primary-100 px-3.5 py-3 flex items-center justify-between">
            <span className="text-[13px] text-primary-800 font-medium">{cost} {tp('crédit(s)')} {tp('seront utilisés')}</span>
            <span className="text-[12px] text-primary">{tp('Solde')} : {credits ?? '—'}</span>
          </div>
          {insufficient && (
            <div className="flex items-center gap-2 text-[12px] text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {tp('Crédits insuffisants')} ({credits}/{cost}).
              <button onClick={onNeedCredits} className="ml-auto font-semibold underline">{tp('Recharger')}</button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <StudioHeader icon={ImageIcon} kind="image" title={tp('Studio Affiches')}
        subtitle={tp('Transformez une image ou une page produit en visuels publicitaires.')}
        right={
          <button onClick={onNeedCredits} className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-primary-50 border border-primary-100 text-primary text-[13px] font-semibold hover:bg-primary-100 transition-colors">
            <Wallet size={14} /> {credits ?? '—'} {tp('crédits')}
          </button>
        } />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-3">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
            <p className="text-[15px] font-semibold text-foreground">{tp('Génération de vos affiches…')}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{tp('Cela prend quelques dizaines de secondes.')}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: Math.min(6, selectedFormats.length || 3) }).map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-background animate-pulse" />)}
          </div>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap px-1">
            <div className="flex items-center gap-2">
              <CheckCircle size={17} className="text-primary-500" />
              <p className="text-[14px] font-semibold text-foreground">{result.creatives?.filter(c => c.imageUrl).length || 0} {tp('visuels générés')}</p>
              {result.cost && <span className="text-[12px] text-muted-foreground">· ~{result.cost.costFcfa} FCFA</span>}
            </div>
            <div className="flex items-center gap-2">
              <Link to="/ecom/creatives?tab=galerie" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary">{tp('Galerie')} <ExternalLink size={13} /></Link>
              <button onClick={reset} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-[13px] font-medium hover:bg-background"><RotateCcw size={13} /> {tp('Recommencer')}</button>
            </div>
          </div>
          {result.analysis && (
            <div className="bg-card rounded-2xl border overflow-hidden">
              <button onClick={() => setShowAnalysis(s => !s)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-background/60">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground"><Package size={15} className="text-primary-500" />{result.analysis.productName || tp('Analyse marketing')}</span>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showAnalysis ? 'rotate-180' : ''}`} />
              </button>
              {showAnalysis && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-50">
                  {(result.analysis.category || result.analysis.targetAudience) && <p className="text-[12px] text-muted-foreground">{result.analysis.category}{result.analysis.category && result.analysis.targetAudience ? ' · ' : ''}{result.analysis.targetAudience}</p>}
                  {result.analysis.emotionalHook && <p className="text-[13px] text-foreground"><span className="font-semibold">{tp('Accroche')} : </span>{result.analysis.emotionalHook}</p>}
                  {result.analysis.promoAngle && <p className="text-[13px] text-foreground"><span className="font-semibold">{tp('Angle promo')} : </span>{result.analysis.promoAngle}</p>}
                  {result.analysis.keyBenefits?.length > 0 && <div className="flex flex-wrap gap-1.5">{result.analysis.keyBenefits.map((b, i) => <span key={i} className="text-[11px] bg-primary-50 text-primary px-2 py-1 rounded-lg">{b}</span>)}</div>}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {result.creatives?.map((creative) => (
              <div key={creative.id} className="group bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square relative bg-background overflow-hidden">
                  {creative.imageUrl ? (
                    <>
                      <img src={creative.imageUrl} alt={creative.label} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => downloadFile(creative.imageUrl, `${creative.id}.png`)} className="w-9 h-9 rounded-xl bg-card flex items-center justify-center text-foreground hover:scale-105 transition-transform"><Download size={15} /></button>
                        <button onClick={() => copyUrl(creative.imageUrl, creative.id)} className="w-9 h-9 rounded-xl bg-card flex items-center justify-center text-foreground hover:scale-105 transition-transform">{copiedId === creative.id ? <Check size={15} className="text-primary" /> : <Copy size={15} />}</button>
                        <a href={creative.imageUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-card flex items-center justify-center text-foreground hover:scale-105 transition-transform"><ExternalLink size={15} /></a>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1.5"><AlertCircle size={20} /><span className="text-[11px]">{tp('Échec')}</span></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{creative.label}</p>
                  {creative.imageUrl && <button onClick={() => downloadFile(creative.imageUrl, `${creative.id}.png`)} className="mt-2 w-full h-8 rounded-lg bg-primary text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-primary"><Download size={11} /> {tp('Télécharger')}</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Wizard accent={A} steps={steps} finalLabel={`${tp('Générer')} · ${cost} ${tp('crédit(s)')}`} busyLabel={tp('Génération…')} onFinish={generate} loading={loading} />
      )}
    </div>
  );
};

function Plus() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}

export default ImageStudio;
