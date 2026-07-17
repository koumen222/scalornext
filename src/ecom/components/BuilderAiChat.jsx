import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Lock } from 'lucide-react';
import { storeProductsApi } from '../services/storeApi';
import ecomApi from '../services/ecommApi.js';
import AiMessageText from './AiMessageText.jsx';
import { useNavigate } from '@/lib/router-compat';
import { tp } from '../i18n/platform.js';

/**
 * Props:
 *  - mode: 'storepage' | 'product' | 'premium'
 *  - context: object passed to the backend (sections, productPageConfig, theme, productName, etc.)
 *  - onPatch: function called with { pageConfigPatch, themePatch, sectionsPatch } when AI responds
 *  - welcomeMessage: optional custom welcome string
 *  - variant: 'floating' (popup flottante, défaut) | 'docked' (panneau ancré à droite, style Shopify Sidekick).
 *    En 'docked', le composant doit être rendu DANS le conteneur flex du builder (après l'aperçu) :
 *    ouvert, il occupe une colonne de 400px ; fermé, seul le bouton flottant (fixed) reste visible.
 */
export default function BuilderAiChat({ mode = 'product', context = {}, onPatch, welcomeMessage, variant = 'floating', dockBarOffset = 0 }) {
  const defaultWelcome = mode === 'storepage'
    ? 'Salut ! Je suis ton assistant IA pour la page boutique.\n\nExemples :\n- "Ajoute une section hero avec fond vert"\n- "Change le titre du hero en Nos Meilleures Ventes"\n- "Ajoute une section témoignages"\n- "Cache la section FAQ"'
    : mode === 'theme'
      ? 'Salut ! Je suis ton assistant IA pour le thème de tes pages produit.\n\nExemples :\n- "Passe les boutons en orange vif"\n- "Donne un look luxe : or, fond crème, police élégante"\n- "Boutons en capsule avec dégradé"\n- "Active le compte à rebours et le stock limité"\n- "Palette plus contrastée pour mobile"'
      : 'Salut ! Je suis ton assistant IA pour la page produit.\n\nExemples :\n- "Mets le bouton en orange"\n- "Ajoute 10 avantages dans le hero"\n- "Change l\'image hero"\n- "Cache la section FAQ"\n- "Ajoute un timer de 15 minutes"';

  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: welcomeMessage || defaultWelcome }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [medias, setMedias] = useState([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const panelRef = useRef(null);

  // Largeur du panneau ancré — redimensionnable en glissant le bord gauche
  const [dockWidth, setDockWidth] = useState(() => {
    if (typeof window === 'undefined') return 400;
    const saved = Number(window.localStorage.getItem('builderAiDockWidth'));
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
        try { window.localStorage.setItem('builderAiDockWidth', String(w)); } catch { /* ignore */ }
        return w;
      });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  // Auto-agrandissement du champ de saisie selon le texte (jusqu'à 160px)
  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);
  useEffect(() => { autoGrow(); }, [input, transcribing, open, autoGrow]);

  // « Modifier avec l'IA » depuis les éditeurs de section : ouvre le chat
  // et pré-remplit l'instruction (event global window 'builder-ai:prefill')
  useEffect(() => {
    const handler = (e) => {
      const text = e?.detail?.text || '';
      setOpen(true);
      if (text) setInput(text);
      setTimeout(() => {
        inputRef.current?.focus();
        // caret en fin de texte
        const el = inputRef.current;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      }, 120);
    };
    window.addEventListener('builder-ai:prefill', handler);
    return () => window.removeEventListener('builder-ai:prefill', handler);
  }, []);

  const handleFileAdd = useCallback(async (files) => {
    const toAdd = [];
    for (const file of Array.from(files)) {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isAudio && !isVideo && !isImage) continue;
      let uploadedUrl = null;
      try {
        const res = await storeProductsApi.uploadImages([file]);
        uploadedUrl = res?.data?.urls?.[0] || res?.data?.data?.[0]?.url || null;
      } catch {}
      const localUrl = URL.createObjectURL(file);
      toAdd.push({ file, localUrl, uploadedUrl, type: isAudio ? 'audio' : isVideo ? 'video' : 'image', name: file.name, placement: '' });
    }
    setMedias(prev => [...prev, ...toAdd]);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000, channelCount: 1 },
      });
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1000) return;
        setTranscribing(true);
        try {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const form = new FormData();
          form.append('audio', blob, `voice.${ext}`);
          const { data } = await ecomApi.post('/builder-ai/transcribe', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
          });
          if (data.success && data.text) {
            setInput(prev => prev ? prev + ' ' + data.text : data.text);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        } catch (err) {
          console.error('[Transcription]', err?.response?.data || err.message);
        }
        setTranscribing(false);
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch (err) { console.error('Mic error:', err); }
  }, [recording]);

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && medias.length === 0) || loading) return;

    const mediaDesc = medias.map(m => `[${m.type}: ${m.name}${m.placement ? ` → "${m.placement}"` : ''}]`).join(' ');
    const displayContent = [text, mediaDesc].filter(Boolean).join('\n');
    setMessages(prev => [...prev, { role: 'user', content: displayContent, medias }]);

    const imageMedias = medias.filter(m => m.type === 'image' && m.uploadedUrl);
    const otherMedias = medias.filter(m => m.type !== 'image' || !m.uploadedUrl);
    let mediaContext = '';
    if (imageMedias.length > 0) {
      mediaContext += '\n\nImages jointes (URLs hébergées) :\n' + imageMedias.map(m =>
        `- URL: ${m.uploadedUrl}${m.placement ? ` → emplacement: "${m.placement}"` : ' (emplacement non précisé — utilise comme image principale)'}`
      ).join('\n');
      mediaContext += '\nPour chaque image, applique-la dans pageConfigPatch.premiumImages en utilisant l\'emplacement indiqué comme clé.';
    }
    if (otherMedias.length > 0) {
      mediaContext += '\n\nAutres médias joints:\n' + otherMedias.map(m =>
        `- ${m.type}: ${m.uploadedUrl || m.localUrl}${m.placement ? ` (emplacement: "${m.placement}")` : ''}`
      ).join('\n');
    }

    const fullMessage = (text || (imageMedias.length > 0 ? 'Intègre cette image sur la page' : 'Analyse ce média')) + mediaContext;
    setInput('');
    setMedias([]);
    setLoading(true);

    try {
      const { data } = await ecomApi.post('/builder-ai/chat', {
        message: fullMessage,
        history: messages.slice(-6),
        // pass context fields depending on mode
        ...(mode === 'storepage'
          ? { sections: context.sections }
          : mode === 'theme'
            ? {
                themeDesign: context.themeDesign,
                themeTemplate: context.themeTemplate,
                sectionColors: context.sectionColors,
                storeName: context.storeName,
              }
            : {
                productPageConfig: context.productPageConfig,
                theme: context.theme,
                productName: context.productName,
              }),
      }, { timeout: 180000 });

      if (data.success) {
        onPatch?.({
          pageConfigPatch: data.pageConfigPatch || null,
          themePatch: data.themePatch || null,
          sectionsPatch: data.sectionsPatch || null,
          designPatch: data.designPatch || null,
          sectionColorsPatch: data.sectionColorsPatch || null,
          themeTemplate: data.themeTemplate || null,
        });
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: (data.reply || 'Fait !')
            + (data.sectionsPatch ? '\n\n✅ Sections mises à jour.' : '')
            + (data.designPatch || data.sectionColorsPatch ? '\n\n✅ Thème mis à jour — pensez à Enregistrer.' : ''),
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Erreur.' }]);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur de connexion.';
      const isProError = err?.response?.data?.requiresPro;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: msg,
        isProError
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, medias, mode, context, onPatch]);

  const accentBtn = 'bg-primary hover:bg-primary-700';

  if (!open) {
    // Mode ancré (builders) : barre de chat flottante centrée en bas —
    // on tape directement dedans, Entrée ouvre le panneau et envoie.
    if (variant === 'docked') {
      const submitFromBar = () => {
        if (input.trim()) {
          setOpen(true);
          send();
        } else {
          setOpen(true);
        }
      };
      return (
        <div className="fixed bottom-5 -translate-x-1/2 z-[9999] w-[min(620px,92vw)]" style={{ left: `calc(50% + ${Math.round(dockBarOffset / 2)}px)` }}>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card shadow-2xl pl-4 pr-1.5 py-1.5 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20 transition">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitFromBar(); } }}
              placeholder={tp('Décris ce que tu veux créer ou modifier…')}
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
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-700 px-4 py-3 text-white shadow-2xl transition-all hover:scale-105 hover:shadow-primary-700/30"
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-semibold hidden sm:inline">{tp('Assistant IA')}</span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={variant === 'docked' ? { width: dockWidth } : undefined}
      className={variant === 'docked'
        ? 'relative flex flex-col h-full bg-card border-l border-border flex-shrink-0 overflow-hidden'
        : 'fixed bottom-6 right-6 z-[9999] flex flex-col w-[400px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-4rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden'}>

      {/* Poignée de redimensionnement — glisser pour élargir/réduire, double-clic = largeur par défaut */}
      {variant === 'docked' && (
        <div
          onPointerDown={startResize}
          onDoubleClick={() => setDockWidth(400)}
          title="Glisser pour redimensionner"
          className="absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize hover:bg-primary/60 active:bg-primary/70 transition-colors"
        />
      )}

      {/* Header — blanc minimal en mode ancré (style Sidekick), dégradé en flottant */}
      <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 ${variant === 'docked'
        ? 'bg-card border-b border-border text-foreground'
        : 'bg-gradient-to-r from-primary to-primary-700 text-white'}`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${variant === 'docked' ? 'text-primary' : ''}`} />
          <span className="text-sm font-bold">{tp('Assistant Builder IA')}</span>
        </div>
        <button onClick={() => setOpen(false)} className={`rounded-full p-1 transition ${variant === 'docked' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'hover:bg-card/20'}`}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.medias?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-w-[85%]">
                {msg.medias.map((m, mi) => (
                  <div key={mi} className="relative rounded-xl overflow-hidden border border-white/20 bg-primary">
                    {m.type === 'image' && <img src={m.localUrl} alt={m.name} className="w-20 h-20 object-cover" />}
                    {m.type === 'audio' && (
                      <div className="flex items-center gap-1.5 px-2.5 py-2 text-white text-[10px]">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm-1 13V8l6 4-6 4z"/></svg>
                        <span className="truncate max-w-[80px]">{m.name}</span>
                      </div>
                    )}
                    {m.type === 'video' && (
                      <div className="flex items-center gap-1.5 px-2.5 py-2 text-white text-[10px]">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                        <span className="truncate max-w-[80px]">{m.name}</span>
                      </div>
                    )}
                    {m.placement && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 truncate">→ {m.placement}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
              msg.role === 'user' ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap leading-relaxed' : 'bg-muted text-foreground rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? <AiMessageText content={msg.content} /> : msg.content}
              {msg.isProError && (
                <div className="mt-3">
                  <button 
                    onClick={() => navigate('/ecom/billing')}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition"
                  >
                    <Lock className="w-3 h-3" />
                    {tp('Découvrir les plans')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <span className="text-sm text-muted-foreground px-1 py-1 select-none">
              {tp('Réflexion')}
              <span className="rai-dot">.</span>
              <span className="rai-dot" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="rai-dot" style={{ animationDelay: '0.4s' }}>.</span>
              <span className="rai-dot" style={{ animationDelay: '0.6s' }}>.</span>
              <span className="rai-dot" style={{ animationDelay: '0.8s' }}>.</span>
              <span className="rai-dot" style={{ animationDelay: '1s' }}>.</span>
            </span>
            <style>{`
              .rai-dot { opacity: 0.15; animation: rai-dot-fade 1.4s ease-in-out infinite; }
              @keyframes rai-dot-fade { 0%, 100% { opacity: 0.15; } 40% { opacity: 1; } }
            `}</style>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Médias en attente */}
      {medias.length > 0 && (
        <div className="px-3 py-2 border-t border-border bg-background flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {medias.map((m, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-border bg-card flex-shrink-0">
                {m.type === 'image' ? (
                  <img src={m.localUrl} alt={m.name} className="w-14 h-14 object-cover" />
                ) : (
                  <div className="w-14 h-14 flex flex-col items-center justify-center bg-primary/10 text-primary">
                    {m.type === 'audio'
                      ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3zm-1 13V8l6 4-6 4z"/></svg>
                      : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    }
                    <span className="text-[9px] mt-0.5 px-1 truncate w-full text-center">{m.name.slice(0, 8)}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={m.placement}
                  onChange={e => setMedias(prev => prev.map((x, xi) => xi === i ? { ...x, placement: e.target.value } : x))}
                  placeholder={tp('où ?')}
                  className="absolute bottom-0 left-0 right-0 text-[9px] bg-black/60 text-white placeholder:text-white/60 border-0 outline-none px-1 py-0.5 w-full"
                />
                <button
                  onClick={() => setMedias(prev => prev.filter((_, xi) => xi !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] leading-none"
                >×</button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{tp('Cliquez sur "où ?" pour indiquer l\'emplacement de chaque média')}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-3 py-3 flex-shrink-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/*,video/*"
          multiple
          className="hidden"
          onChange={e => { handleFileAdd(e.target.files); e.target.value = ''; }}
        />
        <div className={`flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition ${recording ? 'border-red-400 ring-2 ring-red-100' : 'border-border focus-within:border-primary/40'}`}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 mb-0.5 text-muted-foreground hover:text-primary transition"
            title={tp('Joindre image, audio ou vidéo')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={transcribing ? '⏳ Transcription en cours...' : input}
            readOnly={transcribing}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            onPaste={e => {
              const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/') || f.type.startsWith('audio/') || f.type.startsWith('video/'));
              if (files.length > 0) { e.preventDefault(); handleFileAdd(files); }
            }}
            placeholder={recording ? '🔴 Enregistrement vocal...' : tp('Décris ce que tu veux créer ou modifier...')}
            rows={1}
            style={{ maxHeight: 160 }}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none overflow-y-auto"
          />
          <button
            type="button"
            onClick={toggleRecording}
            disabled={transcribing}
            className={`flex-shrink-0 mb-0.5 rounded-lg p-1.5 transition disabled:opacity-40 ${recording ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-red-500'}`}
            title={recording ? 'Arrêter et transcrire' : tp('Note vocale')}
          >
            <svg className="w-4 h-4" fill={recording ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>
          <button
            onClick={send}
            disabled={(!input.trim() && medias.length === 0) || loading || recording || transcribing}
            className={`flex-shrink-0 mb-0.5 rounded-lg p-1.5 text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${accentBtn}`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
