import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Megaphone, Clapperboard, Hash, MessageCircle, Mail, Type,
  Loader2, Copy, Check, Bookmark, AlertCircle, Link2, Wand2, RefreshCw, RotateCcw,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, Field, ChoiceChip, ImportProductBar, stripHtml } from './creativeShared.jsx';
import Wizard from './Wizard.jsx';

const A = ACCENTS.text;

const CONTENT_TYPES = [
  { id: 'product-description', label: tp('Description produit'), icon: FileText, desc: tp('Page de vente AIDA'), count: 1 },
  { id: 'ad-hooks',           label: tp('Hooks publicitaires'), icon: Megaphone, desc: tp('Facebook / TikTok Ads'), count: 6 },
  { id: 'video-script',       label: tp('Script vidéo'),        icon: Clapperboard, desc: tp('UGC / démonstration'), count: 1 },
  { id: 'caption',            label: tp('Légende réseaux'),     icon: Hash, desc: tp('Post Instagram / TikTok'), count: 3 },
  { id: 'whatsapp',           label: tp('Message WhatsApp'),    icon: MessageCircle, desc: tp('Relance & closing'), count: 2 },
  { id: 'email',              label: tp('Email marketing'),     icon: Mail, desc: tp('Promo & réengagement'), count: 1 },
  { id: 'headlines',          label: tp('Titres & accroches'),  icon: Type, desc: tp('Titres de page produit'), count: 5 },
];

const TONES = [
  { id: 'direct', label: tp('Direct') },
  { id: 'emotional', label: tp('Émotionnel') },
  { id: 'premium', label: tp('Premium') },
  { id: 'fun', label: tp('Fun') },
  { id: 'professional', label: tp('Professionnel') },
];

const LANGS = [{ id: 'fr', label: 'FR' }, { id: 'en', label: 'EN' }, { id: 'es', label: 'ES' }];
const LANG_NAMES = { fr: 'français', en: 'anglais', es: 'espagnol' };

const TYPE_CFG = {
  'product-description': { multi: false, maxWords: 200, purpose: 'page de vente e-commerce (méthode AIDA, orientée conversion, marché africain francophone, paiement à la livraison)', task: 'Rédige une description produit persuasive en 4 à 5 paragraphes suivant AIDA (Attention, Intérêt, Désir, Réassurance, Action).' },
  'ad-hooks':            { multi: true,  maxWords: 30,  purpose: 'accroche publicitaire Facebook/TikTok pour un produit e-commerce', task: 'Écris UNE seule accroche publicitaire courte et percutante qui stoppe le scroll.' },
  'video-script':        { multi: false, maxWords: 180, purpose: 'script vidéo UGC pour une publicité produit', task: "Rédige un script vidéo UGC de 20 à 30 secondes structuré : hook, problème, démonstration, bénéfices, appel à l'action." },
  'caption':             { multi: true,  maxWords: 60,  purpose: 'légende de post réseaux sociaux (Instagram/TikTok) pour un produit', task: 'Écris UNE légende engageante avec 2 à 3 emojis et 3 à 5 hashtags pertinents.' },
  'whatsapp':            { multi: true,  maxWords: 80,  purpose: 'message WhatsApp de vente et de relance (cash on delivery)', task: 'Écris UN message WhatsApp court, chaleureux et orienté closing, invitant à commander maintenant.' },
  'email':               { multi: false, maxWords: 180, purpose: 'email marketing promotionnel pour un produit e-commerce', task: 'Rédige un email marketing complet : une ligne "Objet : …" accrocheuse, un corps court et persuasif, puis un CTA clair.' },
  'headlines':           { multi: true,  maxWords: 16,  purpose: 'titre de page produit court et vendeur', task: 'Propose UN titre de page produit court, clair et vendeur (une seule ligne).' },
};

function buildContext({ productName, description, url, toneLabel, langName }) {
  return [
    productName ? `Produit : ${productName}` : '',
    description ? `Détails : ${description}` : '',
    url ? `Lien produit : ${url}` : '',
    `Ton souhaité : ${toneLabel}`,
    `Langue de rédaction : ${langName}`,
  ].filter(Boolean).join('\n');
}

const TextStudio = ({ importedProduct, onImport, onClearImport }) => {
  const [url, setUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('product-description');
  const [tone, setTone] = useState('direct');
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    if (!importedProduct?.id) return;
    setProductName(importedProduct.name || '');
    setDescription(stripHtml(importedProduct.description).slice(0, 500));
    setUrl(importedProduct.url || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedProduct?.id]);

  const activeType = CONTENT_TYPES.find(t => t.id === contentType) || CONTENT_TYPES[0];
  const canGenerate = !!(url.trim() || description.trim() || productName.trim());

  const generate = useCallback(async () => {
    if (!canGenerate) { setError(tp('Ajoutez un lien produit ou une description.')); return; }
    const cfg = TYPE_CFG[contentType] || TYPE_CFG['product-description'];
    const toneLabel = (TONES.find(t => t.id === tone) || TONES[0]).label;
    const langName = LANG_NAMES[language] || 'français';
    const context = buildContext({ productName: productName.trim(), description: description.trim(), url: url.trim(), toneLabel, langName });
    const n = cfg.multi ? Math.max(1, activeType.count) : 1;
    setLoading(true); setError(''); setItems([]); setSavedIds([]);

    const makeReq = (i) => creativeApi.text.generateOne({
      purpose: cfg.purpose,
      context,
      instruction: `${cfg.task}${cfg.multi && n > 1 ? ` Variante ${i} sur ${n} : propose un angle nettement différent des autres.` : ''} Déduis le public cible (hommes, femmes ou mixte) à partir du produit ; n'assume pas un public féminin par défaut et reste neutre en genre (évite "épuisé(e)" et les tournures réservées aux femmes) si le produit est unisexe. Écris uniquement en ${langName}, sur un ton ${toneLabel.toLowerCase()}. Pas de préambule ni de commentaire, seulement le texte demandé.`,
      maxWords: cfg.maxWords,
      format: 'text',
    });

    try {
      let newItems = [];
      if (n === 1) {
        const r = await makeReq(1);
        const txt = (r.data?.text || '').trim();
        if (!r.data?.success || !txt) throw new Error(r.data?.message || tp('Génération impossible, réessayez'));
        newItems = [{ id: 'it-1', title: activeType.label, content: txt }];
      } else {
        const settled = await Promise.allSettled(Array.from({ length: n }, (_, i) => makeReq(i + 1)));
        newItems = settled.map((s, i) => {
          const txt = s.status === 'fulfilled' && s.value?.data?.success ? (s.value.data.text || '').trim() : '';
          return txt ? { id: `it-${i + 1}`, title: `${activeType.label} ${i + 1}`, content: txt } : null;
        }).filter(Boolean);
        if (!newItems.length) {
          const firstErr = settled.find(s => s.status === 'rejected');
          throw new Error(firstErr?.reason?.response?.data?.message || tp('Génération impossible, réessayez'));
        }
      }
      setItems(newItems);
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Erreur lors de la génération'));
    } finally {
      setLoading(false);
    }
  }, [url, productName, description, contentType, tone, language, activeType, canGenerate]);

  const copy = (item) => { navigator.clipboard.writeText(item.content); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 1800); };
  const save = async (item) => {
    setSavedIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
    try { await creativeApi.gallery.save({ type: 'text', label: item.title || activeType.label, content: item.content, productName: productName || undefined, meta: { contentType, tone, language } }); } catch { setSavedIds(prev => prev.filter(id => id !== item.id)); }
  };
  const reset = () => { setItems([]); setError(''); };

  // ── Étapes du wizard ──
  const steps = [
    {
      title: tp('Type'),
      subtitle: tp('Quel contenu voulez-vous créer ?'),
      valid: true,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {CONTENT_TYPES.map(t => {
            const Icon = t.icon; const active = contentType === t.id;
            return (
              <button key={t.id} onClick={() => setContentType(t.id)}
                className={`text-left rounded-2xl border p-3.5 transition-all ${active ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                <Icon size={18} className={active ? A.text : 'text-gray-400'} />
                <div className={`text-[13px] font-semibold mt-2 ${active ? 'text-gray-900' : 'text-gray-700'}`}>{t.label}</div>
                <div className="text-[11px] text-gray-400 leading-tight">{t.desc}</div>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: tp('Produit'),
      subtitle: tp('Sur quel produit porte le contenu ?'),
      valid: canGenerate,
      content: (
        <div className="space-y-4 max-w-xl">
          <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={A} />
          <Field label={tp('Lien produit')} hint={tp('optionnel')}>
            <div className="relative">
              <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition" />
            </div>
          </Field>
          <Field label={tp('Nom du produit')} hint={tp('optionnel')}>
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder={tp('ex. Huile de Batana 100% pure')}
              className="w-full h-11 px-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition" />
          </Field>
          <Field label={tp('Brief / description')} hint={tp('optionnel')}>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={tp('Décrivez le produit, la cible, l\'offre…')}
              className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition resize-none" />
          </Field>
          {!canGenerate && <p className="text-[12px] text-gray-400">{tp('Ajoutez au moins un lien, un nom ou une description pour continuer.')}</p>}
        </div>
      ),
    },
    {
      title: tp('Options'),
      subtitle: tp('Ajustez le ton et la langue, puis générez.'),
      valid: true,
      content: (
        <div className="space-y-5 max-w-xl">
          <div>
            <span className="text-[13px] font-semibold text-gray-700 block mb-2">{tp('Ton')}</span>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(t => <ChoiceChip key={t.id} active={tone === t.id} onClick={() => setTone(t.id)} accent={A}>{t.label}</ChoiceChip>)}
            </div>
          </div>
          <div>
            <span className="text-[13px] font-semibold text-gray-700 block mb-2">{tp('Langue')}</span>
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              {LANGS.map(l => (
                <button key={l.id} onClick={() => setLanguage(l.id)}
                  className={`h-8 px-4 rounded-lg text-[12px] font-bold transition-all ${language === l.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>{l.label}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-3.5 py-2.5 text-[12px] text-blue-700">
            {activeType.count > 1
              ? tp('{n} variantes seront générées.').replace('{n}', String(activeType.count))
              : tp('1 contenu sera généré.')}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <StudioHeader icon={Wand2} kind="text" title={tp('Studio Texte')}
        subtitle={tp('Copies de vente, hooks, scripts et messages — générés autour de votre produit.')} />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
          <button onClick={reset} className="ml-auto text-red-400 hover:text-red-600"><RefreshCw size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="space-y-2"><div className="h-2.5 bg-gray-100 rounded w-full" /><div className="h-2.5 bg-gray-100 rounded w-11/12" /><div className="h-2.5 bg-gray-100 rounded w-4/5" /></div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[13px] text-gray-400">{items.length} {tp('variante(s)')} · <span className="font-medium text-gray-600">{activeType.label}</span></p>
            <div className="flex items-center gap-2">
              <button onClick={generate} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700"><RefreshCw size={13} /> {tp('Régénérer')}</button>
              <button onClick={reset} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-[13px] font-medium hover:bg-gray-50"><RotateCcw size={13} /> {tp('Recommencer')}</button>
            </div>
          </div>
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-500">
                  <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                  {item.title || activeType.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => save(item)} disabled={savedIds.includes(item.id)}
                    className="h-8 px-2.5 rounded-lg border border-gray-200 text-gray-500 text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:text-primary-600 disabled:border-primary-100 disabled:bg-primary-50">
                    <Bookmark size={13} className={savedIds.includes(item.id) ? 'fill-primary-600' : ''} />
                    {savedIds.includes(item.id) ? tp('Enregistré') : tp('Enregistrer')}
                  </button>
                  <button onClick={() => copy(item)} className="h-8 px-2.5 rounded-lg bg-gray-900 text-white text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-800">
                    {copiedId === item.id ? <><Check size={13} /> {tp('Copié')}</> : <><Copy size={13} /> {tp('Copier')}</>}
                  </button>
                </div>
              </div>
              <p className="text-[14px] leading-relaxed text-gray-700 whitespace-pre-wrap">{item.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <Wizard accent={A} steps={steps} finalLabel={tp('Générer le contenu')} busyLabel={tp('Génération…')} onFinish={generate} loading={loading} />
      )}
    </div>
  );
};

export default TextStudio;
