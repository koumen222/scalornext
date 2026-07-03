# Patch backend — multilingue (à appliquer sur le repo `ecomcookpit`, VPS)

> Le frontend `scalor-next` envoie déjà tout ce qu'il faut ; sans ce patch il retombe
> proprement en français partout. 3 fichiers, modifications minimales. À relire avant déploiement.

## 1. `Backend/routes/storeManagement.js` — persister la langue de la boutique

La route `updateStoreConfig` fonctionne par whitelist. Ajouter `language` :

```diff
   const {
     storeName, storeDescription, storeLogo, storeBanner, storeFavicon,
     storePhone, storeWhatsApp, storeCountry, storeThemeColor, primaryColor,
+    language,
     ...
   } = req.body;
```

et, dans le bloc des mappings (après `storeCurrency` par exemple) :

```diff
   if (isStoreEnabled !== undefined) update['storeSettings.isStoreEnabled'] = isStoreEnabled;
+  if (language !== undefined) {
+    const lang = String(language).toLowerCase().slice(0, 2);
+    update['storeSettings.language'] = ['fr', 'en', 'es'].includes(lang) ? lang : 'fr';
+  }
```

Le frontend l'envoie déjà depuis Paramètres boutique (auto-save) — la clé est simplement ignorée aujourd'hui.

## 2. `Backend/routes/storeApi.js` — exposer la langue dans le payload public

Dans `GET /:subdomain`, l'objet `store` du payload (vers la ligne ~84, à côté de `currency`) :

```diff
         currency: settings.storeCurrency || settings.currency || 'XAF',
+        language: settings.language || 'fr',
         country: settings.country || settings.storeCountry || '',
```

C'est ce champ que le storefront Next lit (`store.language`) pour choisir les libellés fr/en/es et `<html lang>`.

## 3. `Backend/services/productPageGeneratorService.js` — prompts IA dans la langue demandée

La route lit déjà `language` du body et le passe aux contextes (`copywritingContext.language`,
`input.language`), et `analyzePremiumProductPage` consomme déjà `premiumContext.language`.
Restent les endroits où le français est figé dans les prompts :

a) **Ebook bonus** (`generateProductBonusEbook`, ~ligne 871) :

```diff
-Language: French${designLine ? `\n${designLine}` : ''}
+Language: ${context.language || 'French'}${designLine ? `\n${designLine}` : ''}
```

b) **System prompt premium** (~ligne 1408) — remplacer la consigne figée :

```diff
-      content: 'Tu es le générateur premium séparé. … Français parfait. …',
+      content: `Tu es le générateur premium séparé. … ${languageDirective(language)} …`,
```

c) **System prompt classique** (`analyzeWithVision`, ~ligne 1983) — remplacer
`2) 100% FRANÇAIS PARFAIT (sauf prompts images en anglais)` par
`2) ${languageDirective(language)} (prompts images toujours en anglais)`.

d) Ajouter en tête du fichier le helper :

```js
function languageDirective(language = 'français') {
  const lang = String(language).toLowerCase();
  if (lang.startsWith('en')) return '100% PERFECT ENGLISH — all customer-facing copy in flawless English';
  if (lang.startsWith('es')) return '100% ESPAÑOL PERFECTO — todo el texto para el cliente en español impecable';
  return '100% FRANÇAIS PARFAIT — zéro faute d’orthographe ni de grammaire';
}
```

Notes :
- Les consignes « labels Avant/Après », orthographe des accents, etc. (~lignes 1974, 2333, 2461…)
  contiennent aussi du français figé pour les TEXTES INCRUSTÉS DANS LES IMAGES — à adapter dans un
  second temps si tu veux aussi des visuels avec textes EN/ES (chercher `French`, `FRANÇAIS`, `Avant`/`Après`).
- Valeurs envoyées par le frontend : `français` | `english` | `español` (dérivées de `storeSettings.language`).

## Déploiement

1. Appliquer, relire, commit sur `ecomcookpit`.
2. Déployer le backend comme d'habitude (VPS).
3. Vérifier : changer la langue d'une boutique test → sauvegarder → `curl https://api.scalor.net/api/store/<sub>` doit renvoyer `"language":"en"` → le storefront passe en anglais ; lancer une génération IA → contenu en anglais.
