import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { Link2, Sparkles, Download, RefreshCw, Image, Globe, Loader2, CheckCircle, AlertCircle, ChevronDown, Copy, ExternalLink, Upload, X, FileText, Zap, Shield, Star, LayoutGrid, Package, Wallet, Plus, CreditCard, Target, List, Scale, Users } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

const FORMATS = [
  { id: 'hero-benefits', get label() { return tp('Bénéfices'); }, icon: Sparkles, get desc() { return tp('Produit + bénéfices clés'); } },
  { id: 'target-promise', label: 'Cible & Promesse', icon: Target, desc: 'Lifestyle + transformation' },
  { id: 'problem-solution', label: 'Prob. / Solution', icon: Zap, get desc() { return tp('Avant / Après split'); } },
  { id: 'how-to-use', label: "Mode d'emploi", icon: List, get desc() { return tp('3 étapes simples'); } },
  { id: 'ingredients-trust', label: 'Confiance', icon: Shield, desc: 'Badges & certifications' },
  { id: 'comparison', label: 'Comparaison', icon: Scale, desc: 'Tableau ✓ / ✗' },
  { id: 'social-proof', label: 'Preuve Sociale', icon: Users, desc: 'Avis clients' },
];

const TEMPLATES = [
  { id: 'listing-green', title: 'Listing', color: 'from-green-500 to-green-700' },
  { id: 'general', title: 'Premium', color: 'from-gray-600 to-gray-900' },
  { id: 'beauty', title: 'Beauté', color: 'from-pink-400 to-rose-500' },
  { id: 'health', title: 'Santé', color: 'from-teal-500 to-green-600' },
  { id: 'tech', title: 'Tech', color: 'from-blue-600 to-indigo-700' },
  { id: 'fashion', title: 'Mode', color: 'from-amber-500 to-yellow-600' },
  { id: 'home', title: 'Maison', color: 'from-orange-400 to-amber-500' },
];

const STEPS = [
  { icon: Globe, label: 'Analyse marketing…' },
  { icon: Sparkles, get label() { return tp('Création des prompts…'); } },
  { icon: Image, get label() { return tp('Génération des images…'); } },
];

const CREDIT_PACKS = [
  { quantity: 10, label: '10 images', price: 800 },
  { quantity: 20, label: '20 images', price: 1600, badge: 'Populaire' },
  { quantity: 50, label: '50 images', price: 4000, badge: 'Meilleure offre' },
];

const CreativeGenerator = () => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [visualTemplate, setVisualTemplate] = useState('listing-green');
  const [imageQuality, setImageQuality] = useState('low'); // low | medium | high
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

  const [credits, setCredits] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyPack, setBuyPack] = useState(CREDIT_PACKS[1]);
  const [buyPhone, setBuyPhone] = useState('');
  const [buyName, setBuyName] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [buySuccess, setBuySuccess] = useState(null);
  const pendingTokenRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const toggleFormat = (id) => {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tp('Sélectionnez une image')); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image trop lourde (max 10 MB)'); return; }
    setProductImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const removeImage = () => {
    setProductImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tp('Sélectionnez une image pour le logo')); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Logo trop lourd (max 5 MB)'); return; }
    setLogoImage(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeLogo = () => {
    setLogoImage(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const canGenerate = productImage || url.trim();

  useEffect(() => {
    ecomApi.get('/billing/creative-credits')
      .then(r => setCredits(r.data.credits ?? 0))
      .catch(() => setCredits(0));
  }, []);

  const startPoll = useCallback((token) => {
    pendingTokenRef.current = token;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const r = await ecomApi.get(`/billing/generation-status/${token}`);
        const s = r.data?.status || r.data?.payment?.status;
        if (s === 'paid') {
          clearInterval(pollIntervalRef.current);
          setBuySuccess('Paiement confirmé ! Vos crédits ont été ajoutés.');
          setBuyLoading(false);
          const cr = await ecomApi.get('/billing/creative-credits');
          setCredits(cr.data.credits ?? 0);
        } else if (s === 'failure' || s === 'no paid') {
          clearInterval(pollIntervalRef.current);
          setBuyError('Paiement échoué ou annulé.');
          setBuyLoading(false);
        }
      } catch { /* ignore */ }
    }, 4000);
  }, []);

  useEffect(() => () => clearInterval(pollIntervalRef.current), []);

  const handleBuyCredits = async () => {
    if (!buyPhone.trim() || buyPhone.trim().length < 8) { setBuyError('Numéro de téléphone invalide'); return; }
    if (!buyName.trim() || buyName.trim().length < 2) { setBuyError('Nom requis'); return; }
    setBuyLoading(true);
    setBuyError('');
    setBuySuccess(null);
    try {
      const r = await ecomApi.post('/billing/buy-creative', {
        quantity: buyPack.quantity,
        phone: buyPhone.trim(),
        clientName: buyName.trim(),
      });
      if (r.data.success && r.data.paymentUrl) {
        window.open(r.data.paymentUrl, '_blank', 'noopener,noreferrer');
        startPoll(r.data.mfToken);
      } else {
        throw new Error(r.data.message || 'Erreur');
      }
    } catch (err) {
      setBuyLoading(false);
      setBuyError(err.response?.data?.message || err.message || 'Erreur paiement');
    }
  };

  // ── Génération asynchrone : POST → jobId, puis polling de l'état ──────────
  // Fiabilité : plus de requête HTTP longue. Le job survit aux coupures réseau,
  // au refresh de la page (reprise via sessionStorage) et aux timeouts proxy.
  const JOB_STORAGE_KEY = 'creativeGenJobId';
  const POLL_INTERVAL_MS = 2500;
  const POLL_MAX_MS = 10 * 60 * 1000;

  const pollJob = useCallback(async (jobId) => {
    const startedAt = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (Date.now() - startedAt > POLL_MAX_MS) {
        throw new Error('La génération prend plus de temps que prévu — retrouvez vos visuels dans « Mes visuels » d\'ici quelques minutes.');
      }
      let job;
      try {
        const res = await ecomApi.get(`/ai/creative-generator/jobs/${jobId}`, { timeout: 15000 });
        job = res.data?.job;
      } catch (err) {
        if (err.response?.status === 404) {
          throw new Error(err.response?.data?.message || 'Suivi perdu — vos visuels déjà générés sont dans « Mes visuels ».');
        }
        // Erreur réseau transitoire → on continue de sonder
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }
      if (!job) { await new Promise(r => setTimeout(r, POLL_INTERVAL_MS)); continue; }

      // Progression visible : analyse → génération (x/n)
      if (job.step === 'analysis' || job.step === 'queued') setCurrentStep(1);
      else if (job.step === 'generating') setCurrentStep(2);

      if (job.status === 'done') return job.result;
      if (job.status === 'error') {
        const partial = (job.creatives || []).some(c => c.imageUrl);
        throw new Error(job.error + (partial ? ' — les visuels réussis sont dans « Mes visuels ».' : ''));
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }, []);

  const runJobToCompletion = useCallback(async (jobId) => {
    try {
      const finalResult = await pollJob(jobId);
      setResult(finalResult);
      if (finalResult?.creditsRemaining !== undefined) setCredits(finalResult.creditsRemaining);
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération');
    } finally {
      try { sessionStorage.removeItem(JOB_STORAGE_KEY); } catch { /* ignore */ }
      setLoading(false);
      setCurrentStep(0);
    }
  }, [pollJob]);

  // Reprise après refresh : si un job était en cours, on se raccroche dessus
  useEffect(() => {
    let jobId = null;
    try { jobId = sessionStorage.getItem(JOB_STORAGE_KEY); } catch { /* ignore */ }
    if (!jobId) return;
    setLoading(true);
    setError('');
    setCurrentStep(1);
    runJobToCompletion(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCurrentStep(1);
    try {
      const formData = new FormData();
      if (productImage) formData.append('productImage', productImage);
      if (logoImage) formData.append('logoImage', logoImage);
      if (url.trim()) formData.append('url', url.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('visualTemplate', visualTemplate);
      formData.append('quality', imageQuality);
      formData.append('formats', JSON.stringify(selectedFormats.length > 0 ? selectedFormats : undefined));

      // Le POST rend un jobId en quelques secondes (validations + réservation crédits)
      const res = await ecomApi.post('/ai/creative-generator', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const jobId = res.data?.jobId;
      if (!jobId) throw new Error(res.data?.error || 'Réponse serveur invalide');
      if (res.data.creditsRemaining !== undefined) setCredits(res.data.creditsRemaining);
      try { sessionStorage.setItem(JOB_STORAGE_KEY, jobId); } catch { /* ignore */ }

      await runJobToCompletion(jobId);
    } catch (err) {
      const errData = err.response?.data;
      if (err.response?.status === 402) {
        setError(errData?.error || 'Crédits insuffisants');
        setShowBuyModal(true);
      } else {
        setError(errData?.error || err.message || 'Erreur lors de la génération');
      }
      setLoading(false);
      setCurrentStep(0);
    }
  }, [url, description, productImage, logoImage, selectedFormats, visualTemplate, imageQuality, canGenerate, runJobToCompletion]);

  const downloadImage = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'creative.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const copyImageUrl = (imageUrl, id) => {
    navigator.clipboard.writeText(imageUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeTpl = TEMPLATES.find(t => t.id === visualTemplate) || TEMPLATES[0];
  const insufficientCredits = credits !== null && credits < selectedFormats.length;

  return (
    <div className="min-h-screen bg-background">

      {/* Buy Credits Modal — bottom-sheet */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-2xl overflow-hidden">
            {/* Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
                  <CreditCard size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{tp('Recharger les crédits')}</p>
                  <p className="text-white/40 text-[11px]">{tp('80 FCFA / image générée')}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBuyModal(false); clearInterval(pollIntervalRef.current); setBuyLoading(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-card/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {buySuccess ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} className="text-green-600" />
                  </div>
                  <p className="font-semibold text-foreground text-base">{buySuccess}</p>
                  <p className="text-sm text-muted-foreground mt-1">{tp('Solde actuel :')} <strong>{credits}</strong> crédit{credits !== 1 ? 's' : ''}</p>
                  <button
                    onClick={() => setShowBuyModal(false)}
                    className="mt-4 w-full h-11 bg-green-600 text-white font-medium rounded-2xl text-sm hover:bg-green-700 transition-colors"
                  >
                    {tp('Fermer')}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tp('Choisir un pack')}</p>
                    <div className="space-y-2">
                      {CREDIT_PACKS.map(pack => (
                        <button
                          key={pack.quantity}
                          onClick={() => setBuyPack(pack)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                            buyPack.quantity === pack.quantity
                              ? 'border-green-600 bg-green-50'
                              : 'border-border hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{pack.label}</span>
                            {pack.badge && (
                              <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                                {pack.badge}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-green-600 text-sm">
                            {pack.price.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{tp('Numéro de téléphone')}</label>
                      <input
                        type="tel"
                        value={buyPhone}
                        onChange={e => setBuyPhone(e.target.value)}
                        placeholder={tp('Ex: 6XXXXXXXX')}
                        className="w-full h-10 px-3 rounded-xl border border-border text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">{tp('Nom complet')}</label>
                      <input
                        type="text"
                        value={buyName}
                        onChange={e => setBuyName(e.target.value)}
                        placeholder={tp('Votre nom')}
                        className="w-full h-10 px-3 rounded-xl border border-border text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all"
                      />
                    </div>
                  </div>

                  {buyError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-red-700 font-medium">
                      <AlertCircle size={13} /> {buyError}
                    </div>
                  )}
                  {buyLoading && (
                    <div className="bg-background border border-border rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Loader2 size={13} className="animate-spin" /> Attente de confirmation du paiement…
                    </div>
                  )}

                  <button
                    onClick={handleBuyCredits}
                    disabled={buyLoading}
                    className="w-full h-11 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {buyLoading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                    {buyLoading ? 'Paiement en cours…' : `Payer ${buyPack.price.toLocaleString('fr-FR')} FCFA`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">{tp('Creatives Image')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tp('Visuels produit premium · IA')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/ecom/creatives/gallery"
              className="h-10 px-3.5 bg-card border border-border text-foreground rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-background transition-colors"
            >
              <LayoutGrid size={14} className="text-muted-foreground" />
              <span className="hidden sm:inline">{tp('Mes visuels')}</span>
            </Link>
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl h-10 px-3.5">
              <Wallet size={14} className="text-green-600" />
              <span className="text-foreground font-semibold text-sm">{credits === null ? '…' : credits}</span>
              <span className="text-muted-foreground text-xs hidden sm:inline">crédit{credits !== 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={() => { setShowBuyModal(true); setBuyError(''); setBuySuccess(null); }}
              className="h-10 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Plus size={14} /> Recharger
            </button>
          </div>
        </div>

        <div className="flex gap-6 items-start flex-col lg:flex-row">

          {/* LEFT: Config Panel */}
          <div className="w-full lg:w-[360px] shrink-0 space-y-4 lg:sticky lg:top-[68px]">

            {/* Upload produit */}
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tp('Image produit')}</p>
              </div>
              <div className="p-4">
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                {!imagePreview ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-7 border-2 border-dashed border-border rounded-xl hover:border-green-600 hover:bg-green-50/40 transition-all flex flex-col items-center gap-2.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-green-100 flex items-center justify-center transition-colors">
                      <Upload size={18} className="text-muted-foreground group-hover:text-green-600" />
                    </div>
                    <div className="text-center">
                      <span className="block text-sm font-medium text-muted-foreground group-hover:text-green-700">{tp('Glissez ou cliquez')}</span>
                      <span className="text-xs text-muted-foreground">{tp('PNG, JPG, WebP — max 10 MB')}</span>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                    <img src={imagePreview} alt="Produit" className="w-14 h-14 object-cover rounded-lg border border-border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{productImage?.name}</p>
                      <p className="text-xs text-muted-foreground">{productImage ? `${(productImage.size / 1024).toFixed(0)} KB` : ''}</p>
                      <button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-green-600 mt-1 hover:text-green-700">{tp('Changer l\'image')}</button>
                    </div>
                    <button onClick={removeImage} className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Logo */}
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tp('Logo de marque')}</p>
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md">{tp('Optionnel')}</span>
              </div>
              <input type="file" ref={logoInputRef} onChange={handleLogoSelect} accept="image/*" className="hidden" />
              {!logoPreview ? (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-border rounded-xl hover:border-green-600/40 hover:bg-green-50/30 transition-all flex items-center gap-3 px-4 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-background group-hover:bg-green-100 flex items-center justify-center transition-colors shrink-0">
                    <Package size={15} className="text-muted-foreground group-hover:text-green-600" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-medium text-muted-foreground group-hover:text-green-700">{tp('Ajouter votre logo')}</span>
                    <span className="text-[10px] text-muted-foreground">{tp('PNG transparent recommandé')}</span>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 p-2.5 bg-background rounded-xl border border-border">
                  <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain rounded-lg bg-card border border-border p-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{logoImage?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{logoImage ? `${(logoImage.size / 1024).toFixed(0)} KB` : ''}</p>
                    <p className="text-[10px] text-green-600 font-medium mt-0.5">{tp('Sera intégré dans les visuels')}</p>
                  </div>
                  <button onClick={removeLogo} className="w-6 h-6 rounded-lg bg-red-50 border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* URL + Description */}
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tp('Informations produit')}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{tp('Lien produit')} <span className="text-muted-foreground font-normal">{tp('(optionnel)')}</span></label>
                <div className="relative">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://alibaba.com/product/..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-border text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all bg-background placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{tp('Description')} <span className="text-muted-foreground font-normal">{tp('(optionnel)')}</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={tp('Ex: Gélules nootropiques au collagène, 60 capsules, ingrédients naturels…')}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all bg-background placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>

            {/* Template */}
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{tp('Univers visuel')}</p>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setVisualTemplate(tpl.id)}
                    className={`relative flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all ${
                      visualTemplate === tpl.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-border hover:border-border hover:bg-background'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tpl.color} shadow-sm`} />
                    <span className={`text-[10px] font-semibold leading-none text-center ${visualTemplate === tpl.id ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {tpl.title}
                    </span>
                    {visualTemplate === tpl.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Qualité d'image */}
            <div className="bg-card rounded-xl border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{tp('Qualité des images')}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'low', title: tp('Brouillon'), desc: tp('Rapide, pour tester'), badge: '⚡' },
                  { id: 'medium', title: tp('Standard'), desc: tp('Bon rapport qualité/coût'), badge: '✨' },
                  { id: 'high', title: tp('Premium'), desc: tp('Détails maximum'), badge: '💎' },
                ].map(q => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setImageQuality(q.id)}
                    className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${
                      imageQuality === q.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-border hover:border-border hover:bg-background'
                    }`}
                  >
                    <span className="text-lg leading-none">{q.badge}</span>
                    <span className={`text-[11px] font-bold leading-none ${imageQuality === q.id ? 'text-green-700' : 'text-foreground'}`}>{q.title}</span>
                    <span className="text-[9.5px] text-muted-foreground leading-tight text-center">{q.desc}</span>
                    {imageQuality === q.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Formats */}
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tp('Slides à générer')}</p>
                <button
                  onClick={() => setSelectedFormats(selectedFormats.length === FORMATS.length ? [] : FORMATS.map(f => f.id))}
                  className="text-[11px] font-medium text-green-600 hover:text-green-700"
                >
                  {selectedFormats.length === FORMATS.length ? 'Tout effacer' : tp('Tout sélectionner')}
                </button>
              </div>
              <div className="space-y-1.5">
                {FORMATS.map(f => {
                  const active = selectedFormats.includes(f.id);
                  const FIcon = f.icon;
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFormat(f.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                        active
                          ? 'border-green-200 bg-green-50'
                          : 'border-border bg-background/50 hover:bg-muted/60'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-green-100' : 'bg-muted'}`}>
                        <FIcon size={14} className={active ? 'text-green-700' : 'text-muted-foreground'} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold block ${active ? 'text-green-800' : 'text-muted-foreground'}`}>{f.label}</span>
                        <span className="text-[10px] text-muted-foreground">{f.desc}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                        active ? 'border-green-600 bg-green-600' : 'border-gray-300'
                      }`}>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-card" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credit Balance */}
            <div className={`rounded-xl border p-4 ${insufficientCredits ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${insufficientCredits ? 'text-red-600' : 'text-green-700'}`}>
                  {insufficientCredits ? 'Crédits insuffisants' : tp('Crédits disponibles')}
                </p>
                <div className="flex items-center gap-1.5">
                  <Wallet size={12} className={insufficientCredits ? 'text-red-400' : 'text-green-600'} />
                  <span className={`text-sm font-semibold ${insufficientCredits ? 'text-red-600' : 'text-green-700'}`}>
                    {credits === null ? '…' : credits}
                  </span>
                </div>
              </div>
              {selectedFormats.length > 0 ? (
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${insufficientCredits ? 'text-red-700' : 'text-green-800'}`}>
                    {selectedFormats.length} crédit{selectedFormats.length > 1 ? 's' : ''} requis
                  </span>
                  {insufficientCredits ? (
                    <span className="text-xs font-semibold text-red-600">Manque {selectedFormats.length - (credits ?? 0)}</span>
                  ) : (
                    <span className="text-xs font-medium text-green-700">→ {(credits ?? 0) - selectedFormats.length} restants</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{tp('Sélectionnez des slides')}</p>
              )}
              {insufficientCredits && (
                <button
                  onClick={() => { setShowBuyModal(true); setBuyError(''); setBuySuccess(null); }}
                  className="mt-3 w-full h-9 bg-green-600 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors"
                >
                  <Plus size={11} /> Recharger les crédits
                </button>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={generate}
              disabled={loading || !canGenerate || selectedFormats.length === 0 || insufficientCredits}
              className="w-full h-12 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading
                ? 'Génération en cours…'
                : insufficientCredits
                ? 'Crédits insuffisants'
                : `Générer ${selectedFormats.length} image${selectedFormats.length > 1 ? 's' : ''}`}
            </button>
            {!canGenerate && !insufficientCredits && (
              <p className="text-[11px] text-center text-muted-foreground -mt-2">{tp('Ajoutez une image produit ou un lien produit')}</p>
            )}
          </div>

          {/* RIGHT: Results Area */}
          <div className="flex-1 min-w-0">

            {/* Loading */}
            {loading && (
              <div className="bg-card rounded-xl border p-10">
                <div className="flex flex-col items-center">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center">
                      <Loader2 size={32} className="text-green-600 animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">{tp('L\'IA crée vos visuels…')}</h3>
                  <p className="text-sm text-muted-foreground mb-8">Ça prend ~2 minutes pour {selectedFormats.length} image{selectedFormats.length > 1 ? 's' : ''}</p>
                  <div className="w-full max-w-xs space-y-2">
                    {STEPS.map((step, i) => {
                      const StepIcon = step.icon;
                      const isDone = i < currentStep;
                      const isCurrent = i === currentStep;
                      return (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          isCurrent ? 'bg-green-50 border-green-200' :
                          isDone ? 'bg-background border-border' :
                          'bg-background border-border'
                        }`}>
                          {isDone ? (
                            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                              <CheckCircle size={14} className="text-white" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                              <Loader2 size={14} className="text-white animate-spin" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                              <StepIcon size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <span className={`text-sm font-medium ${
                            isDone ? 'text-foreground' : isCurrent ? 'text-green-800' : 'text-muted-foreground'
                          }`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">{tp('Erreur de génération')}</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-4">
                {/* Topbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-muted text-foreground border-border">
                      {activeTpl.title}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {result.creatives?.filter(c => c.imageUrl).length} visuels générés
                    </span>
                    {result.cost && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                        ~{result.cost.costFcfa} FCFA
                      </span>
                    )}
                  </div>
                  <button
                    onClick={generate}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 h-8 px-3 rounded-lg transition-colors border border-green-100"
                  >
                    <RefreshCw size={12} /> Regénérer
                  </button>
                </div>

                {/* Analysis accordion */}
                {result.analysis && (
                  <div className="bg-card rounded-xl border overflow-hidden">
                    <button
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-background transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                          <Globe size={14} className="text-muted-foreground" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-semibold text-foreground">{result.analysis.productName}</span>
                          <span className="text-xs text-muted-foreground block">{result.analysis.category} · {result.analysis.targetAudience}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.productImageFound && (
                          <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-md">
                            {tp('Image détectée')}
                          </span>
                        )}
                        <ChevronDown size={15} className={`text-muted-foreground transition-transform ${showAnalysis ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {showAnalysis && (
                      <div className="px-4 pb-4 border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{tp('Accroche')}</p>
                          <p className="text-sm text-foreground">{result.analysis.emotionalHook}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{tp('Angle promo')}</p>
                          <p className="text-sm text-foreground">{result.analysis.promoAngle}</p>
                        </div>
                        {result.analysis.keyBenefits?.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tp('Bénéfices')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {result.analysis.keyBenefits.map((b, i) => (
                                <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-md font-medium">{b}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.analysis.slogans?.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{tp('Slogans')}</p>
                            <div className="space-y-1">
                              {result.analysis.slogans.map((s, i) => (
                                <p key={i} className="text-sm text-foreground bg-background border border-border px-3 py-2 rounded-lg">{s}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {result.creatives?.map((creative) => (
                    <div key={creative.id} className="bg-card rounded-xl border overflow-hidden group hover:shadow-sm hover:-translate-y-0.5 transition-all">
                      <div className="relative aspect-square bg-muted">
                        {creative.imageUrl ? (
                          <>
                            <img
                              src={creative.imageUrl}
                              alt={creative.label}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <div className="absolute bottom-0 inset-x-0 p-3 flex gap-2 justify-center">
                                <button
                                  onClick={() => downloadImage(creative.imageUrl, `${creative.id}.png`)}
                                  className="flex items-center gap-1.5 bg-card text-foreground text-xs font-semibold px-3 py-2 rounded-lg shadow-lg hover:bg-muted transition-colors"
                                >
                                  <Download size={13} /> Télécharger
                                </button>
                                <button
                                  onClick={() => copyImageUrl(creative.imageUrl, creative.id)}
                                  className="w-8 h-8 bg-card/90 text-foreground rounded-lg flex items-center justify-center shadow-lg hover:bg-card transition-colors"
                                >
                                  {copiedId === creative.id ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                                </button>
                                <a
                                  href={creative.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 bg-card/90 text-foreground rounded-lg flex items-center justify-center shadow-lg hover:bg-card transition-colors"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                              <AlertCircle size={18} className="text-red-400" />
                            </div>
                            <p className="text-xs text-muted-foreground text-center leading-tight">{creative.error || tp('Génération échouée')}</p>
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2.5 flex items-center justify-between border-t border-border">
                        <div>
                          <p className="text-xs font-semibold text-foreground leading-tight">{creative.label}</p>
                          <p className="text-[10px] text-muted-foreground">{creative.aspectRatio}</p>
                        </div>
                        {creative.imageUrl && (
                          <button
                            onClick={() => downloadImage(creative.imageUrl, `${creative.id}.png`)}
                            className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors"
                          >
                            <Download size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !result && !error && (
              <div className="bg-card rounded-xl border border-dashed border-border flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-5">
                  <LayoutGrid size={24} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{tp('Vos créas apparaîtront ici')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {tp('Configurez votre produit à gauche, choisissez les slides et lancez la génération.')}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {FORMATS.map(f => {
                    const FIcon = f.icon;
                    return (
                      <span key={f.id} className="flex items-center gap-1 text-[11px] font-medium bg-background border border-border text-muted-foreground px-3 py-1.5 rounded-lg">
                        <FIcon size={11} className="text-muted-foreground" strokeWidth={1.75} />
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeGenerator;
