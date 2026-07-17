import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from '@/lib/router-compat';
import {
  LayoutDashboard, Wand2, Image as ImageIcon, Video, Images, Settings,
  Wallet, ChevronLeft, Store, Rocket, Clapperboard, Languages, Mic, MessageCircle, Zap, Speech,
} from 'lucide-react';
import { tp } from '../i18n/platform.js';
import { useCreativeCredits, BuyCreditsModal } from '../components/creative/creativeShared.jsx';
import CreativeOverview from '../components/creative/CreativeOverview.jsx';
import TextStudio from '../components/creative/TextStudio.jsx';
import ImageStudio from '../components/creative/ImageStudio.jsx';
import VideoStudio from '../components/creative/VideoStudio.jsx';
import MontageStudio from '../components/creative/MontageStudio.jsx';
import TranslationStudio from '../components/creative/TranslationStudio.jsx';
import VoiceStudio from '../components/creative/VoiceStudio.jsx';
import GalleryStudio from '../components/creative/GalleryStudio.jsx';
import LaunchesStudio from '../components/creative/LaunchesStudio.jsx';
import BillingStudio from '../components/creative/BillingStudio.jsx';
import LaunchStudio from '../components/creative/LaunchStudio.jsx';
import ChatStudio from '../components/creative/ChatStudio.jsx';
import AvatarStudio from '../components/creative/AvatarStudio.jsx';
import ProductPicker from '../components/creative/ProductPicker.jsx';
import { stashMontageDraft, stashLaunchResume } from '../components/creative/montageBridge.js';

const NAV = [
  { items: [{ id: 'overview', label: tp('Accueil'), icon: LayoutDashboard }] },
  { section: tp('Créer'), items: [
    { id: 'chat', label: tp('Assistant'), icon: MessageCircle, accent: true, badge: 'NEW' },
    { id: 'launch', label: tp('Lancement'), icon: Rocket },
    { id: 'text',  label: tp('Texte'),    icon: Wand2 },
    { id: 'image', label: tp('Affiches'), icon: ImageIcon },
    { id: 'video', label: tp('Vidéo'),    icon: Video },
    { id: 'voice', label: tp('Voix'),     icon: Mic },
    { id: 'avatar', label: tp('Avatar parlant'), icon: Speech, badge: 'NEW' },
    { id: 'montage', label: tp('Montage'), icon: Clapperboard },
    { id: 'translation', label: tp('Traduction'), icon: Languages },
  ] },
  { section: tp('Bibliothèque'), items: [
    { id: 'launches', label: tp('Mes lancements'), icon: Rocket },
    { id: 'galerie', label: tp('Galerie'), icon: Images },
  ] },
  { section: tp('Compte'), items: [{ id: 'settings', label: tp('Paramètres'), icon: Settings }] },
];
const ALL_ITEMS = NAV.flatMap(g => g.items);
const VALID = ALL_ITEMS.map(i => i.id);

function normalizeTab(t) {
  if (!t) return null;
  if (t === 'gallery') return 'galerie';
  return VALID.includes(t) ? t : null;
}

const CreativeCenter = ({ initialTab = 'overview' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => normalizeTab(searchParams?.get?.('tab')) || normalizeTab(initialTab) || 'overview');
  const { credits, setCredits, refresh } = useCreativeCredits();
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyPack, setBuyPack] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importedProduct, setImportedProduct] = useState(null);

  useEffect(() => {
    const urlTab = normalizeTab(searchParams?.get?.('tab'));
    if (urlTab && urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeTab = useCallback((next) => {
    const t = normalizeTab(next) || 'overview';
    setTab(t);
    try {
      setSearchParams(prev => { const p = new URLSearchParams(prev || undefined); p.set('tab', t); return p; }, { replace: true });
    } catch { /* noop */ }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  const openBuy = useCallback((pack = null) => { setBuyPack(pack); setBuyOpen(true); }, []);
  const onNeedCredits = useCallback(() => openBuy(), [openBuy]);
  const onCreditsChange = useCallback((v) => setCredits(v), [setCredits]);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const clearImport = useCallback(() => setImportedProduct(null), []);
  // Envoi d'un angle marketing (LaunchStudio) vers le Studio Montage : pré-remplit les scènes.
  // Le brouillon passe par un relais module (fiable même si les onglets remontent les composants).
  const handleSendToMontage = useCallback((draft) => {
    stashMontageDraft(draft);
    changeTab('montage');
  }, [changeTab]);
  // Réouverture d'un lancement enregistré dans le studio Lancement (angles,
  // scripts et réglages restaurés → générer les scripts d'autres hooks).
  const handleOpenLaunch = useCallback((record) => {
    stashLaunchResume(record);
    changeTab('launch');
  }, [changeTab]);
  const handleProductSelected = (p) => {
    setImportedProduct(p);
    setPickerOpen(false);
    if (tab === 'overview' || tab === 'galerie' || tab === 'settings') changeTab('text');
  };

  const activeItem = ALL_ITEMS.find(i => i.id === tab) || ALL_ITEMS[0];

  return (
    <div className="min-h-screen bg-background">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* ── Sidebar Scalor (desktop) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 z-30 bg-card border-r border-border">
        {/* Header : retour + marque (style épuré Minea) */}
        <div className="px-4 pt-4 pb-2">
          <Link to="/ecom/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-muted-foreground transition mb-3 group">
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>{tp('Retour à Scalor')}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow-sm">
              <Wand2 size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-foreground truncate leading-tight">Creative Center</p>
              <p className="text-[10px] text-muted-foreground font-medium">{tp('Studio de création IA')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
          {NAV.map((group, gi) => (
            <div key={gi} className="mb-4 last:mb-0">
              {group.section && <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.section}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = tab === item.id; const Icon = item.icon;
                  const rowCls = active
                    ? 'bg-muted text-foreground'
                    : item.accent
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-foreground hover:bg-muted';
                  const iconCls = active
                    ? 'text-foreground'
                    : item.accent
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-muted-foreground';
                  return (
                    <button key={item.id} onClick={() => changeTab(item.id)}
                      className={`w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${rowCls}`}>
                      <Icon size={18} className={`shrink-0 ${iconCls}`} />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/12 text-primary">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* CTA bas — compteur crédits + bouton dégradé (façon Minea) */}
        <div className="p-3">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Wallet size={14} className="text-muted-foreground" />
            <span className="text-[13px] font-semibold text-foreground tabular-nums">{credits ?? '—'}</span>
            <span className="text-xs text-muted-foreground">{tp('crédits')}</span>
          </div>
          <button
            onClick={() => openBuy()}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5 shadow-sm hover:brightness-[1.05] active:scale-[.99] transition"
          >
            <Zap size={15} strokeWidth={2.5} /> {tp('Recharger')}
          </button>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <div className="lg:ml-[240px] flex flex-col min-h-screen">
        {/* Barre mobile (Scalor) */}
        <div className="lg:hidden sticky top-0 z-30 bg-card border-b border-border">
          <div className="px-4 pt-3 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center"><Wand2 size={15} className="text-primary" /></div>
              <span className="font-bold text-sm text-foreground">Creative Center</span>
            </div>
            <Link to="/ecom/dashboard" className="text-[11px] text-muted-foreground hover:text-muted-foreground flex items-center gap-1"><ChevronLeft size={13} /> Scalor</Link>
          </div>
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {ALL_ITEMS.map(item => {
              const active = tab === item.id; const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => changeTab(item.id)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Icon size={14} className={active ? 'text-white' : 'text-muted-foreground'} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Barre supérieure (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-8 h-14 border-b border-border bg-card sticky top-0 z-20">
          <h1 className="text-[15px] font-bold text-foreground">{activeItem.label}</h1>
          <button onClick={openPicker} className="h-9 px-3.5 rounded-xl bg-primary text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-primary transition-colors">
            <Store size={14} /> {tp('Importer un produit')}
          </button>
        </div>

        {/* Contenu */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
            {tab === 'overview' && <CreativeOverview credits={credits} onNavigate={changeTab} onNeedCredits={onNeedCredits} onImport={openPicker} />}
            {tab === 'chat' && <ChatStudio />}
            {tab === 'launch' && <LaunchStudio importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} onSendToMontage={handleSendToMontage} />}
            {tab === 'text' && <TextStudio importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'image' && <ImageStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'video' && <VideoStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} onSendToMontage={handleSendToMontage} />}
            {tab === 'voice' && <VoiceStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'avatar' && <AvatarStudio importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'montage' && <MontageStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'translation' && <TranslationStudio />}
            {tab === 'launches' && <LaunchesStudio onSendToMontage={handleSendToMontage} onNavigate={changeTab} onOpenInStudio={handleOpenLaunch} />}
            {tab === 'galerie' && <GalleryStudio onNavigate={changeTab} />}
            {tab === 'settings' && <BillingStudio credits={credits} onRecharge={() => openBuy()} onBuyPack={openBuy} onCreditsChange={onCreditsChange} />}
          </div>
        </main>
      </div>

      <BuyCreditsModal
        open={buyOpen}
        initialPack={buyPack || undefined}
        onClose={() => setBuyOpen(false)}
        onSuccess={(c) => { setCredits(c); refresh(); }}
      />

      <ProductPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleProductSelected} />
    </div>
  );
};

export default CreativeCenter;
