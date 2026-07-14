import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from '@/lib/router-compat';
import {
  LayoutDashboard, Wand2, Image as ImageIcon, Video, Images, Settings,
  Wallet, ChevronLeft, Store, Rocket, Clapperboard,
} from 'lucide-react';
import { tp } from '../i18n/platform.js';
import { useCreativeCredits, BuyCreditsModal } from '../components/creative/creativeShared.jsx';
import CreativeOverview from '../components/creative/CreativeOverview.jsx';
import TextStudio from '../components/creative/TextStudio.jsx';
import ImageStudio from '../components/creative/ImageStudio.jsx';
import VideoStudio from '../components/creative/VideoStudio.jsx';
import MontageStudio from '../components/creative/MontageStudio.jsx';
import GalleryStudio from '../components/creative/GalleryStudio.jsx';
import LaunchesStudio from '../components/creative/LaunchesStudio.jsx';
import BillingStudio from '../components/creative/BillingStudio.jsx';
import LaunchStudio from '../components/creative/LaunchStudio.jsx';
import ProductPicker from '../components/creative/ProductPicker.jsx';
import { stashMontageDraft } from '../components/creative/montageBridge.js';

const NAV = [
  { items: [{ id: 'overview', label: tp('Accueil'), icon: LayoutDashboard }] },
  { section: tp('Créer'), items: [
    { id: 'launch', label: tp('Lancement'), icon: Rocket },
    { id: 'text',  label: tp('Texte'),    icon: Wand2 },
    { id: 'image', label: tp('Affiches'), icon: ImageIcon },
    { id: 'video', label: tp('Vidéo'),    icon: Video },
    { id: 'montage', label: tp('Montage'), icon: Clapperboard },
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
  const handleProductSelected = (p) => {
    setImportedProduct(p);
    setPickerOpen(false);
    if (tab === 'overview' || tab === 'galerie' || tab === 'settings') changeTab('text');
  };

  const activeItem = ALL_ITEMS.find(i => i.id === tab) || ALL_ITEMS[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* ── Sidebar Scalor (desktop) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 z-30 bg-white border-r border-gray-200">
        {/* Header : retour en haut + marque */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <Link to="/ecom/dashboard" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition mb-3 group">
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>{tp('Retour à Scalor')}</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Wand2 size={18} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">Creative Center</p>
              <p className="text-[10px] text-gray-400 font-medium">{tp('Studio de création IA')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
          {NAV.map((group, gi) => (
            <div key={gi} className="mb-4 last:mb-0">
              {group.section && <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">{group.section}</p>}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = tab === item.id; const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => changeTab(item.id)}
                      className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active ? 'bg-primary-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                      <Icon size={18} className={`shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Crédits (bas) */}
        <div className="border-t border-gray-100 p-3">
          <div className="rounded-xl bg-primary-50 p-3">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-primary-600" />
              <span className="text-[13px] font-semibold text-gray-800">{credits ?? '—'} <span className="text-gray-400 font-normal">{tp('crédits')}</span></span>
            </div>
            <button onClick={() => openBuy()} className="mt-2 w-full h-8 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-[12px] font-semibold transition-colors">{tp('Recharger')}</button>
          </div>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <div className="lg:ml-[240px] flex flex-col min-h-screen">
        {/* Barre mobile (Scalor) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="px-4 pt-3 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center"><Wand2 size={15} className="text-primary-600" /></div>
              <span className="font-bold text-sm text-gray-900">Creative Center</span>
            </div>
            <Link to="/ecom/dashboard" className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1"><ChevronLeft size={13} /> Scalor</Link>
          </div>
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {ALL_ITEMS.map(item => {
              const active = tab === item.id; const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => changeTab(item.id)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Icon size={14} className={active ? 'text-white' : 'text-gray-400'} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Barre supérieure (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-8 h-14 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h1 className="text-[15px] font-bold text-gray-900">{activeItem.label}</h1>
          <button onClick={openPicker} className="h-9 px-3.5 rounded-xl bg-primary-500 text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-primary-600 transition-colors">
            <Store size={14} /> {tp('Importer un produit')}
          </button>
        </div>

        {/* Contenu */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
            {tab === 'overview' && <CreativeOverview credits={credits} onNavigate={changeTab} onNeedCredits={onNeedCredits} onImport={openPicker} />}
            {tab === 'launch' && <LaunchStudio importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} onSendToMontage={handleSendToMontage} />}
            {tab === 'text' && <TextStudio importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'image' && <ImageStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'video' && <VideoStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'montage' && <MontageStudio credits={credits} onCreditsChange={onCreditsChange} onNeedCredits={onNeedCredits} importedProduct={importedProduct} onImport={openPicker} onClearImport={clearImport} />}
            {tab === 'launches' && <LaunchesStudio onSendToMontage={handleSendToMontage} onNavigate={changeTab} />}
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
