import React, { useMemo, useRef, useState } from 'react';
import { Trash2, Palette, Type, Code as CodeIcon, LayoutTemplate, Upload, Loader2 } from 'lucide-react';
import AiImagePromptBox from './AiImagePromptBox.jsx';
import CustomCodeSection from './CustomCodeSection.jsx';
import { storeProductsApi } from '../services/storeApi.js';

/**
 * CustomCodeEditor — éditeur d'une section de code personnalisé avec :
 *  - Design : rendu réel du bloc (styles appliqués, scripts exécutés) + couleurs
 *  - Mise en page : réglages du conteneur (alignement, marges, espacements…)
 *  - Contenu : édition simple des textes et images extraits du HTML, sans toucher au code
 *  - Code : le HTML brut (style + markup + script dans un seul champ)
 * La modification par IA passe par le bouton « IA » de l'en-tête de section (chat).
 *
 * Props:
 *   html          {string}  Code HTML complet de la section
 *   onChangeHtml  {fn}      Appelé avec le nouveau HTML
 *   style         {object}  Styles du conteneur (marges, alignement…)
 *   onChangeStyle {fn}      Appelé avec le nouvel objet style
 *   onRemove      {fn}      Optionnel — bouton « Supprimer la section »
 */

// Le wrapper <body> explicite empêche le parseur de remonter les <style>/<script>
// de tête dans <head> (ils seraient perdus à la re-sérialisation de body.innerHTML).
const parseHtml = (html) => new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');

const collectTextNodes = (doc) => {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const tag = node.parentElement?.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      return (node.nodeValue || '').trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
};

const extractTexts = (html) => {
  if (typeof window === 'undefined' || !html?.trim()) return [];
  try {
    return collectTextNodes(parseHtml(html)).map((n) => n.nodeValue.trim());
  } catch {
    return [];
  }
};

const replaceTextAt = (html, index, value) => {
  try {
    const doc = parseHtml(html);
    const nodes = collectTextNodes(doc);
    if (!nodes[index]) return html;
    nodes[index].nodeValue = value;
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

const extractImages = (html) => {
  if (typeof window === 'undefined' || !html?.trim()) return [];
  try {
    return Array.from(parseHtml(html).body.querySelectorAll('img')).map((img) => img.getAttribute('src') || '');
  } catch {
    return [];
  }
};

const replaceImageAt = (html, index, src) => {
  try {
    const doc = parseHtml(html);
    const imgs = Array.from(doc.body.querySelectorAll('img'));
    if (!imgs[index]) return html;
    imgs[index].setAttribute('src', src);
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

// ─── Design : extraction et remplacement des couleurs du bloc ────────────────
const COLOR_REGEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;

const extractColors = (html) => {
  if (!html?.trim()) return [];
  const matches = html.match(COLOR_REGEX) || [];
  const seen = new Set();
  const out = [];
  matches.forEach((c) => {
    const key = c.toLowerCase().replace(/\s+/g, '');
    if (!seen.has(key)) { seen.add(key); out.push(c); }
  });
  return out.slice(0, 16);
};

const colorToHex = (c) => {
  if (c.startsWith('#')) {
    if (c.length === 4) return `#${[...c.slice(1)].map((ch) => ch + ch).join('')}`.toLowerCase();
    return c.slice(0, 7).toLowerCase();
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#000000';
  const h = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Remplace TOUTES les occurrences d'une couleur ; préserve l'alpha des rgba()
const applyColorChange = (html, original, hex) => {
  let replacement = hex;
  const alphaMatch = original.match(/rgba\([^)]*,\s*([\d.]+)\s*\)/);
  if (alphaMatch) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    replacement = `rgba(${r}, ${g}, ${b}, ${alphaMatch[1]})`;
  }
  // \b évite qu'un hex court (#fff) ne matche le début d'un hex long (#ffffff)
  const pattern = escapeRegExp(original) + (original.startsWith('#') ? '\\b' : '');
  return html.replace(new RegExp(pattern, 'gi'), replacement);
};

const ALL_TABS = [
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'layout', label: 'Mise en page', icon: LayoutTemplate },
  { id: 'contenu', label: 'Contenu', icon: Type },
  { id: 'code', label: 'Code', icon: CodeIcon },
];

const numInputCls = 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent';

const CustomCodeEditor = ({ html = '', onChangeHtml, onRemove, style = {}, onChangeStyle }) => {
  const [tab, setTab] = useState(html.trim() ? 'design' : 'code');

  const texts = useMemo(() => (tab === 'contenu' ? extractTexts(html) : []), [html, tab]);
  const images = useMemo(() => (tab === 'contenu' ? extractImages(html) : []), [html, tab]);
  const colors = useMemo(() => (tab === 'design' ? extractColors(html) : []), [html, tab]);

  const st = style || {};
  const setSt = (key, value) => onChangeStyle?.({ ...st, [key]: value });
  const tabs = onChangeStyle ? ALL_TABS : ALL_TABS.filter((t) => t.id !== 'layout');

  // Upload d'image vers une position <img> du bloc (onglet Contenu)
  // — via bouton OU glisser-déposer d'un fichier sur la ligne
  const fileRef = useRef(null);
  const pendingImageIndexRef = useRef(null);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const uploadFileToIndex = async (file, index) => {
    if (!file || index == null) return;
    setUploadingIndex(index);
    try {
      const res = await storeProductsApi.uploadImages([file]);
      const data = res?.data?.data;
      const url = (Array.isArray(data) && (data[0]?.url || data[0])) || res?.data?.urls?.[0] || '';
      if (url) onChangeHtml(replaceImageAt(html, index, url));
    } catch {
      // upload échoué — on ne touche pas au html
    } finally {
      setUploadingIndex(null);
      pendingImageIndexRef.current = null;
    }
  };

  const triggerImageUpload = (index) => {
    pendingImageIndexRef.current = index;
    fileRef.current?.click();
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    uploadFileToIndex(file, pendingImageIndexRef.current);
  };

  const handleImageDrop = (e, index) => {
    e.preventDefault();
    setDragOverIndex(null);
    const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
    if (file) uploadFileToIndex(file, index);
  };

  return (
    <div className="space-y-3">
      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10.5px] font-bold transition ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Design — rendu live + couleurs modifiables */}
      {tab === 'design' && (
        html.trim() ? (
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-xl bg-white overflow-auto max-h-[320px]">
              <CustomCodeSection content={{ html, style: st }} />
            </div>
            {colors.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Couleurs du bloc</p>
                <div className="space-y-1.5">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorToHex(c)}
                        onChange={(e) => onChangeHtml(applyColorChange(html, c, e.target.value))}
                        className="w-8 h-8 rounded-lg border border-gray-200 p-0.5 cursor-pointer flex-shrink-0"
                        title="Changer cette couleur partout dans le bloc"
                      />
                      <span className="text-[12px] font-mono text-gray-600 truncate">{c}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Chaque couleur est remplacée partout où elle apparaît dans le bloc.</p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic">Aucune couleur détectée dans le code.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-xl p-6 text-center">
            Section vide — générez du code avec l'IA ou écrivez-le dans l'onglet Code.
          </p>
        )
      )}

      {/* Mise en page — réglages du conteneur de la section */}
      {tab === 'layout' && onChangeStyle && (
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-xl bg-white overflow-auto max-h-[240px]">
            {html.trim()
              ? <CustomCodeSection content={{ html, style: st }} />
              : <p className="text-xs text-gray-400 italic p-6 text-center">Section vide</p>}
          </div>
          <div>
            <p className="text-[10.5px] text-gray-400 mb-1">Alignement du texte</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[['', 'Auto'], ['left', 'Gauche'], ['center', 'Centre'], ['right', 'Droite']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setSt('textAlign', v)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition ${(st.textAlign || '') === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Marge haut (px)</p>
              <input type="number" min="0" value={st.marginTop ?? ''} onChange={(e) => setSt('marginTop', e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Marge bas (px)</p>
              <input type="number" min="0" value={st.marginBottom ?? ''} onChange={(e) => setSt('marginBottom', e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Espacement haut (px)</p>
              <input type="number" min="0" value={st.paddingTop ?? ''} onChange={(e) => setSt('paddingTop', e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Espacement bas (px)</p>
              <input type="number" min="0" value={st.paddingBottom ?? ''} onChange={(e) => setSt('paddingBottom', e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Espacement côtés (px)</p>
              <input type="number" min="0" value={st.paddingX ?? ''} onChange={(e) => setSt('paddingX', e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Largeur max (px)</p>
              <input type="number" min="0" value={st.maxWidth ?? ''} onChange={(e) => setSt('maxWidth', e.target.value)} placeholder="Pleine largeur" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Arrondi (px)</p>
              <input type="number" min="0" value={st.borderRadius ?? ''} onChange={(e) => setSt('borderRadius', e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <p className="text-[10.5px] text-gray-400 mb-1">Fond du conteneur</p>
              <div className="flex items-center gap-1">
                <input type="color" value={st.backgroundColor || '#ffffff'} onChange={(e) => setSt('backgroundColor', e.target.value)} className="w-8 h-8 rounded-lg border border-gray-200 p-0.5 cursor-pointer flex-shrink-0" />
                {st.backgroundColor && (
                  <button type="button" onClick={() => setSt('backgroundColor', '')} className="text-[10px] text-gray-400 hover:text-red-500 underline">retirer</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu — édition simple des textes et images */}
      {tab === 'contenu' && (
        <div className="space-y-2">
          {texts.length === 0 && images.length === 0 && (
            <p className="text-xs text-gray-400 italic">Aucun texte ni image détecté — utilisez l'onglet Code.</p>
          )}
          {texts.map((txt, i) => (
            <div key={`t-${i}`}>
              {txt.length > 60 ? (
                <textarea
                  value={txt}
                  rows={3}
                  onChange={(e) => onChangeHtml(replaceTextAt(html, i, e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              ) : (
                <input
                  type="text"
                  value={txt}
                  onChange={(e) => onChangeHtml(replaceTextAt(html, i, e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              )}
            </div>
          ))}
          {images.length > 0 && (
            <div className="pt-1 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500">Images</p>
              {images.map((src, i) => (
                <div key={`i-${i}`} className="space-y-1">
                <div
                  onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragOverIndex(i); } }}
                  onDragLeave={() => setDragOverIndex((cur) => (cur === i ? null : cur))}
                  onDrop={(e) => handleImageDrop(e, i)}
                  className={`flex items-center gap-2 rounded-lg p-0.5 transition ${dragOverIndex === i ? 'ring-2 ring-indigo-400 bg-indigo-50/60' : ''}`}
                  title="Déposez une image ici pour la remplacer"
                >
                  {src ? <img src={src} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0" />}
                  <input
                    type="text"
                    value={src}
                    onChange={(e) => onChangeHtml(replaceImageAt(html, i, e.target.value))}
                    placeholder="https://…"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    title="Uploader une image"
                    disabled={uploadingIndex !== null}
                    onClick={() => triggerImageUpload(i)}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition flex-shrink-0 disabled:opacity-40"
                  >
                    {uploadingIndex === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </button>
                </div>
                {/* Génération / édition IA de cette image */}
                <div className="pl-11">
                  <AiImagePromptBox compact value={src || ''} onGenerated={(url) => onChangeHtml(replaceImageAt(html, i, url))} />
                </div>
                </div>
              ))}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            </div>
          )}

          {/* Générer une NOUVELLE image par IA et l'insérer dans le code */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 mb-1">
              {images.length > 0 ? 'Ajouter une image générée par IA' : 'Images — générer par IA'}
            </p>
            <AiImagePromptBox
              compact
              value=""
              onGenerated={(url) => onChangeHtml(
                `${html || ''}\n<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;margin:14px auto;border-radius:12px" />`
              )}
            />
          </div>
        </div>
      )}

      {/* Code — HTML brut (style + markup + script) */}
      {tab === 'code' && (
        <textarea
          value={html}
          onChange={(e) => onChangeHtml(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono resize-y bg-gray-900 text-green-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder={'<style>\n  .ma-section { padding: 20px; }\n</style>\n\n<div class="ma-section">\n  Votre HTML, embed, widget…\n</div>\n\n<script>\n  // Votre JavaScript\n</script>'}
        />
      )}

      {onRemove && (
        <button type="button" onClick={onRemove}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer la section
        </button>
      )}
    </div>
  );
};

export default CustomCodeEditor;
