import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Sparkles, Send, X, Store, ArrowRight, LayoutDashboard, CheckCircle2, AlertCircle, Zap, MessageCircle, ListChecks, Mic, ImagePlus, Square, Loader2 } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import creativeApi from '../services/creativeApi.js';
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

// Suggestions du MODE AGENT : orientées exécution (actions réelles).
const AGENT_SUGGESTIONS = [
  'Génère le rapport du jour',
  'Relance les clients expédiés par WhatsApp',
  'Planifie ma journée de traitement des commandes',
  'Passe le produit X en winner',
];

// Mode Agent côté BOUTIQUE : actions sur la vitrine.
const STORE_AGENT_SUGGESTIONS = [
  'Crée le produit « Sérum éclat » à 14 900 F',
  'Publie le produit Sérum éclat',
  'Baisse le prix de Sérum éclat à 12 900 F',
  'Mets Sérum éclat en rupture de stock',
];

const StoreAssistantChat = ({ storeName = '', mode = 'store', pageTitle = '', workspaceName = '' }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Mode du chat Scalor (backoffice) : Chat = conseil/analyse (DÉFAUT) ;
  // Agent = planifie, pose des questions, exécute. Persisté entre les sessions.
  const [agentOn, setAgentOn] = useState(() => {
    try { return (window.localStorage.getItem('scalorAssistantMode') || 'chat') === 'agent'; } catch { return false; }
  });
  const setMode = (on) => {
    setAgentOn(on);
    try { window.localStorage.setItem('scalorAssistantMode', on ? 'agent' : 'chat'); } catch { /* ignore */ }
  };
  // Images jointes au prochain message (uploadées → URLs), dictée vocale, stop.
  const [images, setImages] = useState([]); // [{ url, name }]
  const [uploadingImg, setUploadingImg] = useState(false);
  const [listening, setListening] = useState(false);
  const abortRef = useRef(null);
  const recRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  // Dictée vocale (Web Speech API) : le texte reconnu remplit le champ de saisie.
  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { try { recRef.current?.stop(); } catch { /* ignore */ } return; }
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = true;
    const base = inputRef.current?.value ? `${inputRef.current.value.trim()} ` : '';
    rec.onresult = (e) => {
      let heard = '';
      for (const r of e.results) heard += r[0].transcript;
      setInput(base + heard);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }, [listening]);

  // Upload des images jointes (max 3) via le même endpoint média que les builders.
  const addImages = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/')).slice(0, 3 - images.length);
    if (!files.length) return;
    setUploadingImg(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        const { data } = await creativeApi.media.upload(fd);
        if (data?.url) setImages((prev) => [...prev, { url: data.url, name: f.name }].slice(0, 3));
      }
    } catch { /* upload raté : l'image n'est simplement pas jointe */ }
    finally { setUploadingImg(false); }
  }, [images.length]);

  // Stop : interrompt la demande en cours (bouton carré, comme Claude).
  const stopRequest = useCallback(() => { abortRef.current?.abort(); }, []);

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

  const send = useCallback(async (forcedText, { modeOverride } = {}) => {
    const text = (forcedText ?? input).trim();
    if (!text || loading) return;
    if (listening) { try { recRef.current?.stop(); } catch { /* ignore */ } }
    const attached = images.map((im) => im.url);
    setInput('');
    setImages([]);
    setMessages((prev) => [...prev, { role: 'user', content: text, images: attached }]);
    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const effectiveAgent = modeOverride != null ? modeOverride === 'agent' : agentOn;
      const { data } = await ecomApi.post('/builder-ai/store-assistant', {
        message: text,
        storeName,
        context: mode,
        pageTitle,
        workspaceName,
        assistantMode: effectiveAgent ? 'agent' : 'chat',
        images: attached,
        history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      }, { timeout: 120000, signal: abortRef.current.signal });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data?.reply || data?.message || (data?.actions?.length ? 'Action traitée.' : 'Réponse indisponible, réessayez.'),
        grounded: Boolean(data?.grounded),
        dataGeneratedAt: data?.dataGeneratedAt || null,
        actionsExecuted: Array.isArray(data?.actions) ? data.actions : [],
        plan: data?.plan || null,
        question: data?.question || null,
        suggestAgent: Boolean(data?.suggestAgent),
        userText: text, // pour ré-exécuter la demande après bascule en mode Agent
      }]);
    } catch (err) {
      const cancelled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError';
      setMessages((prev) => [...prev, { role: 'assistant', content: cancelled ? '⏹ Demande arrêtée.' : (err?.response?.data?.message || 'Erreur du service IA — réessayez.') }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages, storeName, mode, pageTitle, workspaceName, agentOn, images, listening]);

  const isBackoffice = mode === 'backoffice';
  const suggestions = isBackoffice
    ? (agentOn ? AGENT_SUGGESTIONS : BACKOFFICE_SUGGESTIONS)
    : (agentOn ? STORE_AGENT_SUGGESTIONS : STORE_SUGGESTIONS);

  if (!open) {
    // Barre de chat flottante centrée sur la zone de contenu
    // (sidebar desktop de 240px → décalage de 120px sur lg)
    const submitFromBar = () => {
      const text = input.trim();
      setOpen(true);
      if (text) send(text);
    };
    return (
      <div className="chat-widget-root fixed bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 lg:left-[calc(50%+120px)] z-[9990] w-[min(600px,92vw)] lg:w-[min(600px,calc(100vw-280px))]">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card shadow-2xl pl-4 pr-1.5 py-1.5 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20 transition">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitFromBar(); } }}
            placeholder={isBackoffice ? 'Demandez à l’assistant Scalor…' : tp('Posez une question sur votre boutique…')}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground min-w-0"
          />
          <button
            type="button"
            onClick={submitFromBar}
            title={input.trim() ? tp('Envoyer') : tp('Ouvrir l\'assistant')}
            className="flex-shrink-0 rounded-full bg-gradient-to-r from-primary to-primary-700 p-2.5 text-white hover:opacity-90 transition"
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
      className="chat-widget-root fixed inset-y-0 right-0 z-[9990] flex flex-col max-w-[100vw] bg-card border-l border-border overflow-hidden"
    >
      {/* Poignée de redimensionnement — glisser pour élargir/réduire, double-clic = largeur par défaut */}
      <div
        onPointerDown={startResize}
        onDoubleClick={() => setDockWidth(400)}
        title="Glisser pour redimensionner"
        className="absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize hover:bg-primary/60 active:bg-primary/70 transition-colors"
      />

      {/* Header — blanc minimal, identique aux builders */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 text-foreground min-w-0">
          {isBackoffice ? <LayoutDashboard className="h-4 w-4 text-primary shrink-0" /> : <Store className="h-4 w-4 text-primary shrink-0" />}
          <div className="min-w-0"><span className="block text-sm font-bold truncate">{isBackoffice ? 'Assistant Scalor' : tp('Assistant boutique')}</span>{isBackoffice && pageTitle && <span className="block text-[10px] font-normal text-muted-foreground truncate">{pageTitle}</span>}</div>
        </div>
        <button onClick={() => setOpen(false)} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-sm text-foreground font-semibold mb-1">{tp('Comment puis-je vous aider ?')}</p>
            <p className="text-xs text-muted-foreground mb-4">{isBackoffice ? 'Commandes, produits, finances, sourcing, équipe et WhatsApp.' : tp('Création de produits, livraison, upsells, créas, stats — posez votre question.')}</p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-border text-[12.5px] text-foreground hover:border-primary/30 hover:bg-primary/10/50 transition">
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
              {msg.role === 'user' && msg.images?.length > 0 && (
                <div className="mb-1 flex gap-1.5">
                  {msg.images.map((u) => (
                    <img key={u} src={u} alt="" className="h-14 w-14 rounded-lg object-cover border border-primary/25" />
                  ))}
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                msg.role === 'user' ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap leading-relaxed' : 'bg-muted text-foreground rounded-bl-md'
              }`}>
                {msg.role === 'assistant' ? <AiMessageText content={text} /> : text}
              </div>
              {msg.role === 'assistant' && msg.plan?.steps?.length > 0 && (
                /* Plan de tâches du MODE AGENT */
                <div className="mt-1.5 w-[85%] rounded-xl border border-primary/20 bg-primary/10/60 px-3 py-2.5">
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                    <ListChecks className="h-3.5 w-3.5" /> {msg.plan.title || 'Plan'}
                  </p>
                  <ol className="space-y-1">
                    {msg.plan.steps.map((s, k) => (
                      <li key={k} className="flex items-start gap-2 text-[11.5px] text-primary">
                        <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">{k + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
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
                      <span className="min-w-0">
                        {action.success ? action.result?.label || 'Action exécutée' : action.error || 'Action impossible'}
                        {action.success && action.result?.credentials && (
                          /* Identifiants du membre créé — affichés UNE seule fois, à transmettre */
                          <span className="mt-1 block rounded-lg bg-card/70 px-2 py-1 font-mono text-[10px] text-emerald-900 select-all">
                            {action.result.credentials.email} / {action.result.credentials.password}
                            <span className="block font-sans text-[9px] text-emerald-700">Identifiants à transmettre — affichés une seule fois.</span>
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {msg.role === 'assistant' && msg.question?.question && i === messages.length - 1 && (
                /* Question posée par l'agent : réponses cliquables */
                <div className="mt-1.5 w-[85%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[11.5px] font-semibold text-amber-900">{msg.question.question}</p>
                  {msg.question.options?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {msg.question.options.map((opt) => (
                        <button key={opt} type="button" onClick={() => send(opt)}
                          className="rounded-full border border-amber-300 bg-card px-3 py-1 text-[11.5px] font-bold text-amber-800 transition hover:bg-amber-100">
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {msg.role === 'assistant' && msg.suggestAgent && !agentOn && i === messages.length - 1 && (
                /* Le mode Chat propose de basculer en Agent pour exécuter */
                <button
                  type="button"
                  onClick={() => { setMode(true); if (msg.userText) send(msg.userText, { modeOverride: 'agent' }); }}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-primary-700"
                >
                  <Zap className="h-3.5 w-3.5" /> Passer en mode Agent et exécuter
                </button>
              )}
              {actions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%]">
                  {actions.map((a) => (
                    <button
                      key={a.path}
                      type="button"
                      onClick={() => { setOpen(false); navigate(a.path); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[12px] font-bold text-primary transition hover:bg-primary/15 hover:border-primary/30"
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
            <span className="text-sm text-muted-foreground px-1 py-1 select-none">
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

      {/* Zone de saisie façon Claude : texte en haut, barre d'outils en bas
          (sélecteur Chat/Agent à gauche ; images, micro, envoyer/stop à droite) */}
      <div className="border-t border-border px-3 py-3 flex-shrink-0">
        <div className="rounded-2xl border border-border bg-background px-3 pt-2 pb-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition">
          {images.length > 0 && (
            <div className="mb-1.5 flex gap-1.5">
              {images.map((im, k) => (
                <span key={im.url} className="relative">
                  <img src={im.url} alt={im.name} className="h-12 w-12 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => setImages((prev) => prev.filter((_, j) => j !== k))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-800 p-0.5 text-white hover:bg-gray-600">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            placeholder={listening ? 'Je vous écoute…' : (agentOn ? 'Demandez une action ou posez votre question…' : tp('Posez votre question…'))}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 py-1"
          />
          <div className="mt-1 flex items-center justify-between">
            {/* Sélecteur de mode — en bas, comme Claude. Chat = défaut.
                Présent en backoffice ET en boutique (chacun ses actions). */}
            <div className="inline-flex rounded-full border border-border bg-card p-0.5" title="Chat = conseil et analyse · Agent = exécute les actions, pose des questions, planifie">
              <button type="button" onClick={() => setMode(false)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition ${!agentOn ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-muted-foreground'}`}>
                <MessageCircle className="h-3 w-3" /> Chat
              </button>
              <button type="button" onClick={() => setMode(true)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold transition ${agentOn ? 'bg-primary text-white' : 'text-muted-foreground hover:text-muted-foreground'}`}>
                <Zap className="h-3 w-3" /> Agent
              </button>
            </div>
            <div className="flex items-center gap-1">
              {/* Joindre des images (max 3) */}
              <label className={`rounded-lg p-1.5 transition cursor-pointer ${images.length >= 3 ? 'opacity-30 pointer-events-none' : 'text-muted-foreground hover:bg-gray-200 hover:text-foreground'}`} title="Joindre des images">
                {uploadingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
              </label>
              {/* Dictée vocale */}
              {speechSupported && (
                <button type="button" onClick={toggleVoice} title={listening ? 'Arrêter la dictée' : 'Dicter au micro'}
                  className={`rounded-lg p-1.5 transition ${listening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-muted-foreground hover:bg-gray-200 hover:text-foreground'}`}>
                  <Mic className="h-4 w-4" />
                </button>
              )}
              {/* Envoyer ↔ Stop */}
              {loading ? (
                <button type="button" onClick={stopRequest} title="Arrêter la demande"
                  className="flex-shrink-0 rounded-lg p-1.5 text-white bg-gray-800 hover:bg-gray-700 transition">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!input.trim()}
                  className="flex-shrink-0 rounded-lg p-1.5 text-white bg-primary hover:bg-primary-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreAssistantChat;
