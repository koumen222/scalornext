import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Sparkles, Send, X, Store, ArrowRight, LayoutDashboard, CheckCircle2, AlertCircle } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import AiMessageText from './AiMessageText.jsx';
import { tp } from '../i18n/platform.js';

// Extrait les marqueurs [[action:Libellé|/chemin]] d'une réponse assistant.
// Retourne { text (sans marqueurs), actions: [{label, path}] } — chemins /ecom uniquement.
const parseAssistantActions = (raw = '') => {
  const actions = [];
  const seen = new Set();
  const text = String(raw)
    .replace(/\[\[action:([^|\]]+)\|([^\]]+)\]\]/g, (_, label, path) => {
      const cleanPath = String(path).trim();
      const cleanLabel = String(label).trim();
      if (cleanPath.startsWith('/ecom') && cleanLabel && !seen.has(cleanPath) && actions.length < 4) {
        seen.add(cleanPath);
        actions.push({ label: cleanLabel, path: cleanPath });
      }
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text, actions };
};

/**
 * StoreAssistantChat — assistant IA général de la section Boutique.
 * Guide le marchand sur la création et la gestion (produits, livraison,
 * upsells, créas, stats…) : conseils et parcours, sans modifier la boutique.
 * Monté dans BoutiqueLayout, masqué sur les builders (qui ont leur propre IA).
 */

const STORE_SUGGESTIONS = [
  'Comment créer mon premier produit ?',
  'Configurer la livraison par ville',
  'Créer des visuels publicitaires',
  'Augmenter mon panier moyen avec les upsells',
];

const BACKOFFICE_SUGGESTIONS = [
  'Quelles commandes dois-je traiter en priorité ?',
  'Analyse la rentabilité de mes produits',
  'Comment organiser mon sourcing ?',
  'Configurer mes notifications WhatsApp',
];

const StoreAssistantChat = ({ storeName = '', mode = 'store', pageTitle = '', workspaceName = '' }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Largeur du panneau ancré (même comportement que l'assistant des builders)
  const [dockWidth, setDockWidth] = useState(() => {
    if (typeof window === 'undefined') return 400;
    const saved = Number(window.localStorage.getItem('storeAssistantDockWidth'));
    return saved >= 300 && saved <= 800 ? saved : 400;
  });

  const startResize = useCallback((e) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    const rightEdge = rect ? rect.right : window.innerWidth;
    const onMove = (ev) => {
      const max = Math.min(720, Math.round(window.innerWidth * 0.6));
      setDockWidth(Math.min(max, Math.max(300, Math.round(rightEdge - ev.clientX))));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      setDockWidth((w) => {
        try { window.localStorage.setItem('storeAssistantDockWidth', String(w)); } catch { /* ignore */ }
        return w;
      });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  // Réserve l'espace du panneau dans le layout (le contenu se rétracte au lieu
  // d'être recouvert) — même logique que le panneau ancré des builders.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      root.style.setProperty('--store-assistant-dock', open && isDesktop ? `${dockWidth}px` : '0px');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      root.style.setProperty('--store-assistant-dock', '0px');
    };
  }, [open, dockWidth]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  const send = useCallback(async (forcedText) => {
    const text = (forcedText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const { data } = await ecomApi.post('/builder-ai/store-assistant', {
        message: text,
        storeName,
        context: mode,
        pageTitle,
        workspaceName,
        history: messages.slice(-8),
      }, { timeout: 120000 });
      setMessages((prev) => [...prev, { role: 'assistant', content: data?.reply || data?.message || (data?.actions?.length ? 'Action traitée.' : 'Réponse indisponible, réessayez.'), grounded: Boolean(data?.grounded), dataGeneratedAt: data?.dataGeneratedAt || null, actionsExecuted: Array.isArray(data?.actions) ? data.actions : [] }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err?.response?.data?.message || 'Erreur du service IA — réessayez.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, storeName, mode, pageTitle, workspaceName]);

  const isBackoffice = mode === 'backoffice';
  const suggestions = isBackoffice ? BACKOFFICE_SUGGESTIONS : STORE_SUGGESTIONS;

  if (!open) {
    // Barre de chat flottante centrée sur la zone de contenu
    // (sidebar desktop de 240px → décalage de 120px sur lg)
    const submitFromBar = () => {
      const text = input.trim();
      setOpen(true);
      if (text) send(text);
    };
    return (
      <div className="fixed bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 lg:left-[calc(50%+120px)] z-[9990] w-[min(600px,92vw)] lg:w-[min(600px,calc(100vw-280px))]">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white shadow-2xl pl-4 pr-1.5 py-1.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition">
          <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitFromBar(); } }}
            placeholder={isBackoffice ? 'Demandez à l’assistant Scalor…' : tp('Posez une question sur votre boutique…')}
            className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 min-w-0"
          />
          <button
            type="button"
            onClick={submitFromBar}
            title={input.trim() ? tp('Envoyer') : tp('Ouvrir l\'assistant')}
            className="flex-shrink-0 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 p-2.5 text-white hover:opacity-90 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{ width: dockWidth }}
      className="fixed inset-y-0 right-0 z-[9990] flex flex-col max-w-[100vw] bg-white border-l border-gray-200 overflow-hidden"
    >
      {/* Poignée de redimensionnement — glisser pour élargir/réduire, double-clic = largeur par défaut */}
      <div
        onPointerDown={startResize}
        onDoubleClick={() => setDockWidth(400)}
        title="Glisser pour redimensionner"
        className="absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize hover:bg-indigo-400/60 active:bg-indigo-500/70 transition-colors"
      />

      {/* Header — blanc minimal, identique aux builders */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-900">
          {isBackoffice ? <LayoutDashboard className="h-4 w-4 text-indigo-600" /> : <Store className="h-4 w-4 text-indigo-600" />}
          <div><span className="block text-sm font-bold">{isBackoffice ? 'Assistant Scalor' : tp('Assistant boutique')}</span>{isBackoffice && pageTitle && <span className="block text-[10px] font-normal text-gray-400">{pageTitle}</span>}</div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-sm text-gray-700 font-semibold mb-1">{tp('Comment puis-je vous aider ?')}</p>
            <p className="text-xs text-gray-400 mb-4">{isBackoffice ? 'Commandes, produits, finances, sourcing, équipe et WhatsApp.' : tp('Création de produits, livraison, upsells, créas, stats — posez votre question.')}</p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 text-[12.5px] text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const { text, actions } = msg.role === 'assistant'
            ? parseAssistantActions(msg.content)
            : { text: msg.content, actions: [] };
          return (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-md whitespace-pre-wrap leading-relaxed' : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                {msg.role === 'assistant' ? <AiMessageText content={text} /> : text}
              </div>
              {msg.role === 'assistant' && msg.grounded && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Données Scalor analysées
                </span>
              )}
              {msg.role === 'assistant' && msg.actionsExecuted?.length > 0 && (
                <div className="mt-1.5 w-[85%] space-y-1.5">
                  {msg.actionsExecuted.map((action, actionIndex) => (
                    <div key={`${action.type}-${actionIndex}`} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[10px] font-medium ${action.success ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-red-100 bg-red-50 text-red-700'}`}>
                      {action.success ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      <span>{action.success ? action.result?.label || 'Action exécutée' : action.error || 'Action impossible'}</span>
                    </div>
                  ))}
                </div>
              )}
              {actions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%]">
                  {actions.map((a) => (
                    <button
                      key={a.path}
                      type="button"
                      onClick={() => { setOpen(false); navigate(a.path); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-700 transition hover:bg-indigo-100 hover:border-indigo-300"
                    >
                      {a.label}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <span className="text-sm text-gray-500 px-1 py-1 select-none">
              {tp('Réflexion')}
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((d, i) => (
                <span key={i} className="sa-dot" style={{ animationDelay: `${d}s` }}>.</span>
              ))}
            </span>
            <style>{`
              .sa-dot { opacity: 0.15; animation: sa-dot-fade 1.4s ease-in-out infinite; }
              @keyframes sa-dot-fade { 0%, 100% { opacity: 0.15; } 40% { opacity: 1; } }
            `}</style>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            placeholder={tp('Posez votre question…')}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-w-0"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 rounded-lg p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreAssistantChat;
