import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Square, Plus, Copy, Check, Sparkles } from 'lucide-react';
import ecomApi from '../../services/ecommApi.js';
import AiMessageText from '../AiMessageText.jsx';
import { tp } from '../../i18n/platform.js';

const SUGGESTIONS = [
  'Donne-moi 5 angles pub pour un complément minceur',
  'Écris une accroche WhatsApp pour relancer un client',
  'Idées de contenu TikTok pour vendre en COD',
  'Comment améliorer mon taux de livraison ?',
];

// ChatStudio — chat conversationnel général branché sur POST /builder-ai/free-chat.
// Design aligné sur les chats modernes (ChatGPT/Claude) : colonne centrée,
// messages assistant en texte plein (sans bulle), bulle discrète côté
// utilisateur, grande barre de saisie arrondie avec envoi/stop.
const ChatStudio = () => {
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const abortRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // Auto-agrandissement du textarea (jusqu'à ~8 lignes)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 192)}px`;
  }, [input]);

  const send = useCallback(async (text) => {
    const content = String(text ?? input).trim();
    if (!content || loading) return;
    setError('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const res = await ecomApi.post('/builder-ai/free-chat', { messages: next }, { signal: abortRef.current.signal, timeout: 120000 });
      const reply = res.data?.data?.reply || '';
      setMessages(m => [...m, { role: 'assistant', content: reply || tp('(réponse vide)') }]);
    } catch (e) {
      const cancelled = e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError';
      if (cancelled) setMessages(m => [...m, { role: 'assistant', content: tp('⏹ Réponse interrompue.') }]);
      else setError(e?.response?.data?.message || tp('Erreur — réessayez.'));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages]);

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const copyMessage = async (content, i) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(-1), 1500);
    } catch { /* clipboard indisponible */ }
  };

  const empty = messages.length === 0;

  // Barre de saisie (partagée entre l'accueil centré et la conversation)
  const inputBar = (
    <div className="w-full bg-card border border-border rounded-[26px] shadow-[0_2px_14px_rgba(0,0,0,0.06)] focus-within:border-gray-300 focus-within:shadow-[0_4px_22px_rgba(0,0,0,0.09)] transition px-4 py-2.5">
      <div className="flex items-end gap-2.5">
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={tp('Écris ton message…')}
          className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground outline-none"
        />
        {loading ? (
          <button
            onClick={stop}
            className="w-9 h-9 shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition"
            aria-label={tp('Arrêter')}
            title={tp('Arrêter la réponse')}
          >
            <Square size={13} className="fill-current" />
          </button>
        ) : (
          <button
            onClick={() => send()}
            disabled={!input.trim()}
            className="w-9 h-9 shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 disabled:bg-muted disabled:text-gray-300 disabled:cursor-not-allowed transition"
            aria-label={tp('Envoyer')}
          >
            <ArrowUp size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-170px)] min-h-[480px]">
      {/* En-tête minimal : juste « Nouveau chat » quand une conversation existe */}
      {!empty && (
        <div className="flex items-center justify-end pb-2">
          <button
            onClick={() => { setMessages([]); setError(''); }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground h-8 px-3 rounded-full hover:bg-muted transition"
          >
            <Plus size={13} /> {tp('Nouveau chat')}
          </button>
        </div>
      )}

      {empty ? (
        /* ── Accueil façon ChatGPT/Claude : titre + saisie au centre, chips dessous ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-6">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <Sparkles size={20} className="text-primary-500" />
          </div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-foreground mb-7 text-center">{tp('Comment puis-je t’aider ?')}</h1>
          <div className="w-full max-w-2xl">{inputBar}</div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-2xl">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[13px] text-muted-foreground bg-card border border-border rounded-full px-3.5 py-2 hover:border-gray-300 hover:bg-background transition"
              >
                {tp(s)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-8">{tp("L'IA peut se tromper. Vérifie les infos importantes.")}</p>
        </div>
      ) : (
        <>
          {/* ── Conversation : colonne centrée, assistant en texte plein, user en bulle ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-1 sm:px-4 py-4 space-y-7">
              {messages.map((m, i) => (
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] bg-muted text-foreground rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="group">
                    <div className="text-[15px] leading-7 text-foreground">
                      <AiMessageText content={m.content} />
                    </div>
                    <button
                      onClick={() => copyMessage(m.content, i)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition"
                      title={tp('Copier')}
                    >
                      {copiedIdx === i ? <><Check size={12} /> {tp('Copié')}</> : <><Copy size={12} /> {tp('Copier')}</>}
                    </button>
                  </div>
                )
              ))}
              {loading && (
                <div className="inline-flex items-center gap-1.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 text-center pt-1">{error}</p>}

          {/* ── Saisie en bas, centrée sur la même colonne ── */}
          <div className="pt-2">
            <div className="max-w-3xl mx-auto px-1 sm:px-4">
              {inputBar}
              <p className="text-[11px] text-muted-foreground text-center mt-1.5">{tp("L'IA peut se tromper. Vérifie les infos importantes.")}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatStudio;
