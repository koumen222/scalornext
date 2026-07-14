import React from 'react';
import BuilderAiChat from './BuilderAiChat.jsx';

// Wrapper de compatibilité pour ProductPageBuilder et PremiumPageBuilder
// Props: productPageConfig, theme, productName, onApplyChanges, onApplyTheme, variant
export default function BuilderAIChatWidget({ productPageConfig, theme, productName = '', onApplyChanges, onApplyTheme, variant = 'floating', dockBarOffset = 0 }) {
  return (
    <BuilderAiChat
      mode="product"
      variant={variant}
      dockBarOffset={dockBarOffset}
      context={{ productPageConfig, theme, productName }}
      onPatch={({ pageConfigPatch, themePatch }) => {
        if (pageConfigPatch && onApplyChanges) onApplyChanges(pageConfigPatch);
        if (themePatch && onApplyTheme) onApplyTheme(themePatch);
      }}
    />
  );
}
