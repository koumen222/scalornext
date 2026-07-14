/**
 * Bibliothèque de sections prédéfinies pour le builder de page produit.
 * Chaque template devient une section personnalisée (customSections) :
 * ajoutée en un clic, puis modifiable via les onglets Design (couleurs),
 * Mise en page, Contenu (textes/images) et Code.
 *
 * Conventions : classes préfixées uniques (.scx-…), mobile-first,
 * aucune dépendance externe, textes orientés e-commerce COD Afrique francophone.
 */

export const SECTION_TEMPLATES = [
  {
    id: 'annonce-defilante',
    icon: 'Megaphone',
    label: "Barre d'annonce défilante",
    desc: 'Message qui défile en continu',
    placement: 'top',
    html: `<style>
.scx-annonce{background:#0F6B4F;color:#fff;overflow:hidden;padding:10px 0;font-weight:700;font-size:14px;white-space:nowrap}
.scx-annonce-track{display:inline-block;animation:scx-annonce-defile 16s linear infinite}
@keyframes scx-annonce-defile{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
</style>
<div class="scx-annonce"><div class="scx-annonce-track"><span style="padding:0 46px">🚚 Livraison rapide partout</span><span style="padding:0 46px">💵 Paiement à la livraison</span><span style="padding:0 46px">🔥 Offre limitée aujourd'hui</span><span style="padding:0 46px">🚚 Livraison rapide partout</span><span style="padding:0 46px">💵 Paiement à la livraison</span><span style="padding:0 46px">🔥 Offre limitée aujourd'hui</span></div></div>`,
  },
  {
    id: 'banniere-countdown',
    icon: 'Timer',
    label: 'Bannière promo + compte à rebours',
    desc: 'Offre limitée avec timer',
    placement: 'top',
    html: `<style>
.scx-cd{background:#DC2626;color:#fff;text-align:center;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.scx-cd-txt{font-weight:800;font-size:14px}
.scx-cd-timer{background:rgba(0,0,0,0.25);border-radius:8px;padding:4px 12px;font-family:monospace;font-size:17px;font-weight:800;letter-spacing:1px}
</style>
<div class="scx-cd"><span class="scx-cd-txt">🔥 OFFRE SPÉCIALE — se termine dans</span><span class="scx-cd-timer">15:00</span></div>
<script>
(function(){var el=document.querySelector('.scx-cd-timer');if(!el||el.dataset.scxInit)return;el.dataset.scxInit='1';var end=Date.now()+15*60*1000;setInterval(function(){var s=Math.max(0,Math.floor((end-Date.now())/1000));var m=Math.floor(s/60),r=s%60;el.textContent=(m<10?'0':'')+m+':'+(r<10?'0':'')+r;},1000);})();
</script>`,
  },
  {
    id: 'avant-apres',
    icon: 'ArrowLeftRight',
    label: 'Avant / Après',
    desc: 'Deux images côte à côte avec étiquettes',
    placement: 'bottom',
    html: `<style>
.scx-aa{padding:40px 16px;max-width:860px;margin:0 auto}
.scx-aa h2{text-align:center;font-size:24px;font-weight:900;color:#111827;margin:0 0 24px}
.scx-aa-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.scx-aa-card{position:relative;border-radius:16px;overflow:hidden;background:#F3F4F6;aspect-ratio:4/5}
.scx-aa-card img{width:100%;height:100%;object-fit:cover;display:block}
.scx-aa-tag{position:absolute;top:10px;left:10px;background:#111827;color:#fff;font-size:12px;font-weight:800;padding:4px 12px;border-radius:999px}
.scx-aa-card:last-child .scx-aa-tag{background:#0F6B4F}
@media(max-width:480px){.scx-aa h2{font-size:20px}}
</style>
<section class="scx-aa"><h2>Des résultats visibles</h2><div class="scx-aa-grid"><div class="scx-aa-card"><span class="scx-aa-tag">AVANT</span><img src="https://placehold.co/600x750/e5e7eb/9ca3af?text=Avant" alt="Avant"></div><div class="scx-aa-card"><span class="scx-aa-tag">APRÈS</span><img src="https://placehold.co/600x750/d1fae5/0F6B4F?text=Apres" alt="Après"></div></div></section>`,
  },
  {
    id: 'video-youtube',
    icon: 'Play',
    label: 'Vidéo YouTube',
    desc: 'Player vidéo responsive avec titre',
    placement: 'bottom',
    html: `<style>
.scx-video{padding:40px 16px;background:#111827;text-align:center}
.scx-video h2{color:#fff;font-size:24px;font-weight:900;margin:0 0 20px}
.scx-video-wrap{position:relative;padding-bottom:56.25%;height:0;max-width:860px;margin:0 auto;border-radius:14px;overflow:hidden}
.scx-video-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
</style>
<section class="scx-video"><h2>Découvrez le produit en action</h2><div class="scx-video-wrap"><iframe src="https://www.youtube.com/embed/VIDEO_ID" allowfullscreen title="Vidéo produit"></iframe></div></section>`,
  },
  {
    id: 'badges-confiance',
    icon: 'Shield',
    label: 'Badges de confiance',
    desc: 'Livraison, paiement, garantie, support',
    placement: 'bottom',
    html: `<style>
.scx-badges{padding:28px 16px;background:#F9FAFB;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB}
.scx-badges-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:960px;margin:0 auto;text-align:center}
.scx-badge-ico{font-size:26px;margin-bottom:6px}
.scx-badge-t{font-size:13px;font-weight:800;color:#111827}
.scx-badge-d{font-size:11.5px;color:#6B7280;margin-top:2px}
@media(max-width:640px){.scx-badges-grid{grid-template-columns:repeat(2,1fr)}}
</style>
<section class="scx-badges"><div class="scx-badges-grid"><div><div class="scx-badge-ico">🚚</div><div class="scx-badge-t">Livraison rapide</div><div class="scx-badge-d">24-72h selon votre ville</div></div><div><div class="scx-badge-ico">💵</div><div class="scx-badge-t">Paiement à la livraison</div><div class="scx-badge-d">Payez à la réception</div></div><div><div class="scx-badge-ico">✅</div><div class="scx-badge-t">Qualité garantie</div><div class="scx-badge-d">Produit vérifié</div></div><div><div class="scx-badge-ico">💬</div><div class="scx-badge-t">Support WhatsApp</div><div class="scx-badge-d">7j/7 à votre écoute</div></div></div></section>`,
  },
  {
    id: 'etapes-utilisation',
    icon: 'ListOrdered',
    label: "Étapes d'utilisation (1-2-3)",
    desc: 'Comment utiliser le produit en 3 étapes',
    placement: 'bottom',
    html: `<style>
.scx-steps{padding:44px 16px;max-width:860px;margin:0 auto}
.scx-steps h2{text-align:center;font-size:24px;font-weight:900;color:#111827;margin:0 0 28px}
.scx-steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.scx-step{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:22px 16px;text-align:center}
.scx-step-n{width:38px;height:38px;border-radius:50%;background:#0F6B4F;color:#fff;font-weight:900;font-size:17px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.scx-step-t{font-size:15px;font-weight:800;color:#111827;margin-bottom:6px}
.scx-step-d{font-size:13px;color:#6B7280;line-height:1.55}
@media(max-width:640px){.scx-steps-grid{grid-template-columns:1fr}}
</style>
<section class="scx-steps"><h2>Comment l'utiliser ?</h2><div class="scx-steps-grid"><div class="scx-step"><div class="scx-step-n">1</div><div class="scx-step-t">Préparez</div><div class="scx-step-d">Décrivez la première étape simple d'utilisation.</div></div><div class="scx-step"><div class="scx-step-n">2</div><div class="scx-step-t">Appliquez</div><div class="scx-step-d">Décrivez le geste principal, quand et comment.</div></div><div class="scx-step"><div class="scx-step-n">3</div><div class="scx-step-t">Profitez</div><div class="scx-step-d">Décrivez le résultat obtenu jour après jour.</div></div></div></section>`,
  },
  {
    id: 'tableau-comparatif',
    icon: 'Table',
    label: 'Tableau comparatif',
    desc: 'Votre produit vs les alternatives',
    placement: 'bottom',
    html: `<style>
.scx-comp{padding:44px 16px;max-width:720px;margin:0 auto}
.scx-comp h2{text-align:center;font-size:24px;font-weight:900;color:#111827;margin:0 0 24px}
.scx-comp table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.scx-comp th,.scx-comp td{padding:12px 14px;font-size:13.5px;text-align:center;border-bottom:1px solid #F3F4F6}
.scx-comp th{background:#111827;color:#fff;font-weight:800}
.scx-comp th:first-child,.scx-comp td:first-child{text-align:left;font-weight:700;color:#111827}
.scx-comp th:nth-child(2){background:#0F6B4F}
.scx-comp .scx-oui{color:#0F6B4F;font-weight:900}
.scx-comp .scx-non{color:#DC2626;font-weight:900}
</style>
<section class="scx-comp"><h2>Pourquoi nous choisir ?</h2><table><tr><th>Critère</th><th>Notre produit</th><th>Les autres</th></tr><tr><td>Qualité premium</td><td class="scx-oui">✓</td><td class="scx-non">✗</td></tr><tr><td>Résultats rapides</td><td class="scx-oui">✓</td><td class="scx-non">✗</td></tr><tr><td>Paiement à la livraison</td><td class="scx-oui">✓</td><td class="scx-non">✗</td></tr><tr><td>Support client 7j/7</td><td class="scx-oui">✓</td><td class="scx-non">✗</td></tr></table></section>`,
  },
  {
    id: 'temoignage-vedette',
    icon: 'Star',
    label: 'Témoignage vedette',
    desc: 'Grande citation client mise en avant',
    placement: 'bottom',
    html: `<style>
.scx-temo{padding:48px 16px;background:#0F6B4F;text-align:center}
.scx-temo-stars{color:#FBBF24;font-size:20px;letter-spacing:3px;margin-bottom:14px}
.scx-temo-q{max-width:680px;margin:0 auto;color:#fff;font-size:20px;line-height:1.55;font-weight:700;font-style:italic}
.scx-temo-a{margin-top:16px;color:rgba(255,255,255,0.85);font-size:13.5px;font-weight:700}
@media(max-width:480px){.scx-temo-q{font-size:17px}}
</style>
<section class="scx-temo"><div class="scx-temo-stars">★★★★★</div><p class="scx-temo-q">« J'étais sceptique au début, mais après 2 semaines les résultats parlent d'eux-mêmes. Je recommande à 100%, livraison rapide et paiement à la réception. »</p><div class="scx-temo-a">— Aminata K., Abidjan ✓ Achat vérifié</div></section>`,
  },
  {
    id: 'faq-accordeon',
    icon: 'HelpCircle',
    label: 'FAQ accordéon',
    desc: 'Questions fréquentes dépliables (sans JS)',
    placement: 'bottom',
    html: `<style>
.scx-faq{padding:44px 16px;max-width:720px;margin:0 auto}
.scx-faq h2{text-align:center;font-size:24px;font-weight:900;color:#111827;margin:0 0 24px}
.scx-faq details{border:1px solid #E5E7EB;border-radius:12px;margin-bottom:10px;background:#fff;overflow:hidden}
.scx-faq summary{padding:14px 16px;font-size:14.5px;font-weight:800;color:#111827;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
.scx-faq summary::after{content:'+';font-size:20px;color:#0F6B4F;font-weight:900}
.scx-faq details[open] summary::after{content:'−'}
.scx-faq-a{padding:0 16px 14px;font-size:13.5px;color:#6B7280;line-height:1.6}
</style>
<section class="scx-faq"><h2>Questions fréquentes</h2><details><summary>Quels sont les délais de livraison ?</summary><div class="scx-faq-a">Livraison en 24 à 72h selon votre ville. Notre livreur vous appelle avant de passer.</div></details><details><summary>Comment se passe le paiement ?</summary><div class="scx-faq-a">Vous payez à la livraison, en espèces ou mobile money, uniquement après avoir reçu votre commande.</div></details><details><summary>Et si le produit ne me convient pas ?</summary><div class="scx-faq-a">Contactez-nous sur WhatsApp, notre équipe trouve une solution rapidement.</div></details></section>`,
  },
  {
    id: 'livraison-paiement',
    icon: 'Truck',
    label: 'Livraison & paiement',
    desc: 'Explique le COD étape par étape',
    placement: 'bottom',
    html: `<style>
.scx-liv{padding:40px 16px;background:#F0FDF4}
.scx-liv-in{max-width:720px;margin:0 auto;text-align:center}
.scx-liv h2{font-size:22px;font-weight:900;color:#111827;margin:0 0 18px}
.scx-liv-row{display:flex;align-items:flex-start;gap:12px;text-align:left;background:#fff;border:1px solid #DCFCE7;border-radius:12px;padding:14px 16px;margin-bottom:10px}
.scx-liv-ico{font-size:22px;flex-shrink:0}
.scx-liv-t{font-size:14px;font-weight:800;color:#111827}
.scx-liv-d{font-size:12.5px;color:#6B7280;margin-top:2px;line-height:1.5}
</style>
<section class="scx-liv"><div class="scx-liv-in"><h2>Commandez en toute confiance</h2><div class="scx-liv-row"><span class="scx-liv-ico">📝</span><div><div class="scx-liv-t">1. Vous commandez</div><div class="scx-liv-d">Remplissez le formulaire en 30 secondes, sans payer d'avance.</div></div></div><div class="scx-liv-row"><span class="scx-liv-ico">📞</span><div><div class="scx-liv-t">2. On vous appelle</div><div class="scx-liv-d">Notre équipe confirme votre commande et votre adresse.</div></div></div><div class="scx-liv-row"><span class="scx-liv-ico">🚚</span><div><div class="scx-liv-t">3. Livraison rapide</div><div class="scx-liv-d">Recevez votre colis en 24-72h selon votre ville.</div></div></div><div class="scx-liv-row"><span class="scx-liv-ico">💵</span><div><div class="scx-liv-t">4. Vous payez à la réception</div><div class="scx-liv-d">Espèces ou mobile money, seulement quand le produit est entre vos mains.</div></div></div></div></section>`,
  },
  {
    id: 'cta-whatsapp',
    icon: 'MessageCircle',
    label: 'Bandeau WhatsApp',
    desc: 'Appel à commander via WhatsApp',
    placement: 'bottom',
    html: `<style>
.scx-wa{padding:36px 16px;background:#111827;text-align:center}
.scx-wa h2{color:#fff;font-size:21px;font-weight:900;margin:0 0 8px}
.scx-wa p{color:#9CA3AF;font-size:13.5px;margin:0 0 18px}
.scx-wa-btn{display:inline-flex;align-items:center;gap:10px;background:#25D366;color:#fff;font-weight:800;font-size:15px;padding:13px 26px;border-radius:999px;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,0.35)}
</style>
<section class="scx-wa"><h2>Une question avant de commander ?</h2><p>Notre équipe vous répond en quelques minutes sur WhatsApp.</p><a class="scx-wa-btn" href="https://wa.me/22500000000?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20votre%20produit" target="_blank" rel="noopener noreferrer">💬 Discuter sur WhatsApp</a></section>`,
  },
  {
    id: 'stats-cles',
    icon: 'BarChart3',
    label: 'Chiffres clés',
    desc: 'Preuve sociale en 3 statistiques',
    placement: 'bottom',
    html: `<style>
.scx-stats{padding:36px 16px;background:#fff;border-top:1px solid #F3F4F6;border-bottom:1px solid #F3F4F6}
.scx-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:720px;margin:0 auto;text-align:center}
.scx-stat-v{font-size:26px;font-weight:900;color:#0F6B4F}
.scx-stat-l{font-size:12.5px;color:#6B7280;font-weight:700;margin-top:4px}
@media(max-width:480px){.scx-stat-v{font-size:21px}}
</style>
<section class="scx-stats"><div class="scx-stats-grid"><div><div class="scx-stat-v">+2 500</div><div class="scx-stat-l">Clients satisfaits</div></div><div><div class="scx-stat-v">4,8/5</div><div class="scx-stat-l">Note moyenne</div></div><div><div class="scx-stat-v">24-72h</div><div class="scx-stat-l">Livraison rapide</div></div></div></section>`,
  },
  {
    id: 'galerie-3-images',
    icon: 'ImageIcon',
    label: 'Galerie 3 images',
    desc: 'Trois visuels produit côte à côte',
    placement: 'bottom',
    html: `<style>
.scx-gal{padding:40px 16px;max-width:960px;margin:0 auto}
.scx-gal h2{text-align:center;font-size:24px;font-weight:900;color:#111827;margin:0 0 22px}
.scx-gal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.scx-gal-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;display:block;background:#F3F4F6}
@media(max-width:640px){.scx-gal-grid{grid-template-columns:1fr;max-width:420px;margin:0 auto}}
</style>
<section class="scx-gal"><h2>En images</h2><div class="scx-gal-grid"><img src="https://placehold.co/600x600/f3f4f6/9ca3af?text=Image+1" alt="Visuel 1"><img src="https://placehold.co/600x600/f3f4f6/9ca3af?text=Image+2" alt="Visuel 2"><img src="https://placehold.co/600x600/f3f4f6/9ca3af?text=Image+3" alt="Visuel 3"></div></section>`,
  },
];

export default SECTION_TEMPLATES;
