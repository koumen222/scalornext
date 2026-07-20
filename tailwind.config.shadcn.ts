import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
// On ÉTEND le config existant sans jamais le modifier.
import base from './tailwind.config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseExtend: any = (base.theme as any)?.extend ?? {};
const baseColors = baseExtend.colors ?? {};
const basePlugins = (base.plugins ?? []) as NonNullable<Config['plugins']>;
const baseContent = base.content as string[];

const config: Config = {
  ...base,
  darkMode: ['class'],
  content: [...baseContent, './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    ...base.theme,
    extend: {
      ...baseExtend,
      colors: {
        ...baseColors,
        // primary : on garde la rampe 50→900 existante, on ajoute juste DEFAULT + foreground.
        primary: {
          ...(typeof baseColors.primary === 'object' ? baseColors.primary : {}),
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Tokens shadcn/ui (nouveaux, ne touchent pas scalor/ecom)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        brand: {
          copper: 'hsl(var(--brand-copper))',
          'copper-foreground': 'hsl(var(--brand-copper-foreground))',
          danger: 'hsl(var(--danger))',
          success: 'hsl(var(--success))',
          warning: 'hsl(var(--warning))',
        },
      },
      borderRadius: {
        ...(baseExtend.borderRadius ?? {}),
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        ...(baseExtend.keyframes ?? {}),
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        ...(baseExtend.animation ?? {}),
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [...basePlugins, tailwindcssAnimate],
};

export default config;
