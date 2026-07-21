import React from 'react';

/**
 * Rendu léger du markdown des réponses IA (sans dépendance) :
 * **gras**, titres #/##/###, listes à puces (-, •) et numérotées (1. / 1)),
 * lignes vides = respiration. Tout le reste est affiché tel quel.
 */

const inline = (txt) =>
  String(txt)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**') ? (
        <strong key={j} className="font-bold">{seg.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={j}>{seg}</React.Fragment>
      )
    );

const AiMessageText = ({ content }) => {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" aria-hidden="true" />;

        const heading = trimmed.match(/^#{1,4}\s+(.*)/);
        if (heading) return <p key={i} className="mt-1.5 font-bold">{inline(heading[1])}</p>;

        const bullet = trimmed.match(/^[-•]\s+(.*)/);
        if (bullet) {
          return (
            <p key={i} className="flex gap-1.5 pl-0.5">
              <span className="select-none opacity-60">•</span>
              <span className="min-w-0 flex-1">{inline(bullet[1])}</span>
            </p>
          );
        }

        const numbered = trimmed.match(/^(\d{1,2})[.)]\s+(.*)/);
        if (numbered) {
          return (
            <p key={i} className="flex gap-1.5 pl-0.5">
              <span className="select-none font-bold">{numbered[1]}.</span>
              <span className="min-w-0 flex-1">{inline(numbered[2])}</span>
            </p>
          );
        }

        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
};

export default AiMessageText;
