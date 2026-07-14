import React, { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

/**
 * AiTextPromptBox — génération de texte court par IA pour les formulaires admin
 * (descriptions de collections, titres, accroches…). Pendant de AiImagePromptBox.
 *
 * Props :
 *  - purpose     : nature du texte (ex. 'collection-description')
 *  - context     : objet passé à l'IA (nom, produits, boutique…)
 *  - onGenerated : (text) => void
 *  - maxWords    : longueur max (défaut 45)
 *  - label       : libellé du lien replié (défaut « Générer par IA »)
 *  - withMethods : affiche le choix d'une méthode de copywriting (descriptions produit)
 */

// Méthodes de copywriting éprouvées en vente directe / COD
export const COPYWRITING_METHODS = [
  { id: 'aida', label: 'AIDA', hint: 'Attention → Intérêt → Désir → Action', instruction: 'Structure AIDA : une accroche forte qui capte l\'attention, éveille l\'intérêt avec les points forts, crée le désir en projetant le client dans les bénéfices, termine par un appel à l\'action clair (commander maintenant, paiement à la livraison).' },
  { id: 'pas', label: 'PAS', hint: 'Problème → Agitation → Solution', instruction: 'Structure PAS : nommer le problème précis que vit le client, l\'agiter (conséquences concrètes, frustration quotidienne), puis présenter le produit comme LA solution avec ses bénéfices.' },
  { id: 'bab', label: 'Avant / Après', hint: 'Avant → Après → Pont', instruction: 'Structure Avant-Après-Pont : décrire la vie du client avec le problème, puis la vie une fois le problème résolu, et présenter le produit comme le pont entre les deux.' },
  { id: 'fab', label: 'FAB', hint: 'Caractéristique → Avantage → Bénéfice', instruction: 'Structure FAB : pour chaque caractéristique clé du produit, donner l\'avantage qu\'elle apporte puis le bénéfice concret dans la vie du client.' },
  { id: 'story', label: 'Storytelling', hint: 'Une histoire client courte', instruction: 'Mini-storytelling : raconter en quelques lignes l\'histoire d\'un client type (prénom local) qui vivait le problème, découvre le produit et voit son quotidien changer — finir sur une invitation à commander.' },
  { id: 'benefits', label: 'Bénéfices directs', hint: 'Liste orientée conversion', instruction: 'Description directe orientée bénéfices : phrases courtes, chaque paragraphe met en avant un bénéfice concret, ton confiant, finir par une réassurance (livraison, paiement à la réception).' },
];

const AiTextPromptBox = ({ purpose, context = {}, onGenerated, maxWords = 45, label, withMethods = false, format = 'plain' }) => {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [methodId, setMethodId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMethod = COPYWRITING_METHODS.find((m) => m.id === methodId);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await ecomApi.post('/builder-ai/generate-text', {
        purpose,
        context,
        instruction: [activeMethod?.instruction, instruction.trim()].filter(Boolean).join(' — '),
        maxWords,
        format,
      }, { timeout: 120000 });
      if (data?.success && data.text) {
        onGenerated?.(data.text);
        setInstruction('');
        setOpen(false);
      } else {
        setError(data?.message || tp('Génération impossible, réessayez'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || tp('Génération impossible, réessayez'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setError(''); }}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 transition hover:text-indigo-800"
      >
        <Sparkles className="h-3 w-3" />
        {label || tp('Générer par IA')}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2">
      {loading ? (
        <p className="flex items-center gap-2 px-1 py-1.5 text-[12px] font-semibold text-slate-600 select-none">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
          {tp('Rédaction en cours…')}
        </p>
      ) : (
        <>
          {withMethods && (
            <div>
              <div className="flex flex-wrap gap-1">
                {COPYWRITING_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.hint}
                    onClick={() => setMethodId(methodId === m.id ? '' : m.id)}
                    className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition ${methodId === m.id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {activeMethod && (
                <p className="mt-1 px-0.5 text-[10px] font-semibold text-indigo-600">{activeMethod.hint}</p>
              )}
            </div>
          )}
          <div className="flex items-start gap-1.5">
            <input
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }}
              placeholder={tp('Consigne (optionnelle) : ton, angle, promo à mentionner…')}
              className="flex-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
              title={tp('Fermer')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700"
          >
            <Sparkles className="h-3 w-3" />
            {tp('Générer le texte')}
          </button>
        </>
      )}
    </div>
  );
};

export default AiTextPromptBox;
