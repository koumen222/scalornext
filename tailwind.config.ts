import type { Config } from 'tailwindcss';

// Config reprise à l'identique d'ecomcookpit/tailwind.config.js — seul `content` change.
const config: Config = {
    darkMode: ['class'],
    content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				'50': '#e6f2ed',
  				'100': '#c0ddd2',
  				'200': '#96c7b5',
  				'300': '#6cb198',
  				'400': '#4d9f82',
  				'500': '#0F6B4F',
  				'600': '#0d6048',
  				'700': '#0a533e',
  				'800': '#084634',
  				'900': '#053326'
  			},
  			scalor: {
  				black: '#0F1115',
  				green: '#0F6B4F',
  				'green-light': '#14855F',
  				'green-dark': '#0A5740',
  				sand: '#D8CFC4',
  				'sand-light': '#EDE8E2',
  				'sand-dark': '#C4B8A9',
  				copper: '#C56A2D',
  				'copper-light': '#D4803F',
  				'copper-dark': '#A85824'
  			},
  			ecom: {
  				primary: '#0F6B4F',
  				'primary-dark': '#0A5740',
  				secondary: '#C56A2D',
  				danger: '#730000',
  				warning: '#f59e0b',
  				info: '#0F6B4F',
  				success: '#22c55e'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Satoshi',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			satoshi: [
  				'Satoshi',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
};

export default config;
