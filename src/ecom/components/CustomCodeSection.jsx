import React, { useEffect, useRef } from 'react';

/**
 * CustomCodeSection — rend le code personnalisé (HTML / CSS / JS) d'une
 * section "customCode" du builder de page produit.
 *
 * Le code est fourni par le marchand pour sa propre page : il est injecté
 * tel quel (même niveau de confiance que customSections / customJs générés
 * par l'IA dans StoreProductPagePremium).
 *
 * - html : injecté via innerHTML ; les <script> qu'il contient sont
 *   ré-exécutés (innerHTML ne les exécute pas nativement) — nécessaire pour
 *   les embeds type TikTok/Instagram/widgets.
 * - css  : injecté dans une balise <style>.
 * - js   : exécuté après l'injection du HTML.
 *
 * Props:
 *   content {object} { html, css, js }
 */
const CustomCodeSection = ({ content = {} }) => {
  const containerRef = useRef(null);
  const html = String(content.html || '');
  const css = String(content.css || '');
  const js = String(content.js || '');

  // Un contenu composé uniquement de commentaires (placeholders par défaut)
  // est considéré comme vide.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const hasHtml = html.trim().length > 0;
  const hasCss = stripComments(css).trim().length > 0;
  const hasJs = stripComments(js).trim().length > 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = html;
    // Ré-exécuter les <script> présents dans le HTML injecté
    el.querySelectorAll('script').forEach((oldScript) => {
      const script = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
      if (oldScript.textContent) script.textContent = oldScript.textContent;
      oldScript.replaceWith(script);
    });
    if (hasJs) {
      try {
        new Function(js)();
      } catch (e) {
        console.warn('[customCode] Erreur JS:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, js]);

  if (!hasHtml && !hasCss && !hasJs) return null;

  // Styles de mise en page appliqués au conteneur (réglés dans l'onglet Design)
  const st = content.style || {};
  const px = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : `${Number(v)}px`);
  const wrapperStyle = {
    marginTop: px(st.marginTop),
    marginBottom: px(st.marginBottom),
    paddingTop: px(st.paddingTop),
    paddingBottom: px(st.paddingBottom),
    paddingLeft: px(st.paddingX),
    paddingRight: px(st.paddingX),
    textAlign: st.textAlign || undefined,
    borderRadius: px(st.borderRadius),
    background: st.backgroundColor || undefined,
    overflow: px(st.borderRadius) ? 'hidden' : undefined,
    ...(px(st.maxWidth) ? { maxWidth: px(st.maxWidth), marginLeft: 'auto', marginRight: 'auto' } : {}),
  };

  return (
    <div className="custom-code-section" data-section="customCode" style={wrapperStyle}>
      {hasCss && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div ref={containerRef} />
    </div>
  );
};

export default CustomCodeSection;
