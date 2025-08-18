import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['var(--font-poppins)', 'sans-serif'],
        'righteous': ['var(--font-righteous)', 'sans-serif'],
        'sans': ['var(--font-poppins)', 'sans-serif'],
      },
      colors: {
        // UP App Colors
        'primary': '#0057FF',
        'primary-faded': '#E7EEFD',
        'primary-text': '#000000',
        'secondary-text': '#FFFFFF',
        'text-black': '#222226',
        'text-body-black': '#171717',
        'text-description-gray': '#525252',
        'title-black': '#212121',
        'slate-black': '#232222',
        'black-shades-600': '#424242',
        
        // Message and UI colors
        'message-box-bg': '#FFFFFF',
        'user-message-bg': '#0057FF',
        'message-box-border': '#E6E6E6',
        'app-bar-bg': '#FFFFFF',
        'icon-slate-white': '#F4F4F4',
        'passive-icon': '#8D8D8D',
        
        // Gray variations
        'gray-300-custom': '#E0E0E0',
        'gray-350': '#D6D6D6',
        'passive-day': '#C8C8C8',
        
        // Accent colors
        'flush-orange': '#EC692B',
        'orchid': '#985DF8',
        'turquoise': '#00D9C0',
        'turquoise-100': '#CCF7F2',
        'error-red': '#EF4444',
        
        // Chat specific colors
        'habit-chat-bg': '#E5EEFF',
        'blockquote-bg': '#E6FBF9',
        'reaction-overlay-bg': '#111D33',
        'reaction-overlay-text': '#313131',
        'badge-box-bg': '#FFF1E6',
        'badge-title': '#FC7700',
        
        // Training colors
        'training-complete-start': '#CFEBE8',
        'training-complete-end': '#E7FFF1',
        'training-ready-bg': '#F5EFFE',
        'training-ready-border': '#E0CEFD',
        'training-locked-bg': '#E5EEFF',
        'training-locked-border': '#B2CDFF',
        
        // Keep existing for compatibility
        white: "#ffffff",
        gray: {
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          500: "#6b7280",
          600: "#525252",
          700: "#374151",
          800: "#1f2937",
        },
        blue: {
          50: "#eff6ff",
          100: "#dbeafe", 
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#0057FF",
          700: "#1d4ed8",
          800: "#1e40af",
        },
        "dark-bg": "#101214",
        "dark-secondary": "#1d1f21",
        "dark-tertiary": "#3b3d40",
        "blue-primary": "#0275ff",
        "stroke-dark": "#2d3135",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
