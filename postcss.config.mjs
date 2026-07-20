// Switch design system : par défaut shadcn ; `SCALOR_UI=legacy` => config Tailwind d'origine.
// tailwind.config.ts n'est JAMAIS modifié ; shadcn vit dans tailwind.config.shadcn.ts.
const useShadcn = process.env.SCALOR_UI !== 'legacy';

export default {
  plugins: {
    tailwindcss: {
      config: useShadcn ? './tailwind.config.shadcn.ts' : './tailwind.config.ts',
    },
    autoprefixer: {},
  },
}
