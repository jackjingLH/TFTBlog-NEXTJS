import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens for AI Hero style
        background: '#FFFFFF',        // Pure white main background
        surface: '#F9FAFB',           // Light gray for card surfaces
        border: '#E5E7EB',            // Neutral gray for borders

        // Text colors
        'text-primary': '#111827',    // Near-black for main text
        'text-secondary': '#6B7280',  // Mid-gray for secondary text
        'text-muted': '#9CA3AF',      // Light gray for muted text

        // Accent colors (subdued blue-purple)
        accent: {
          DEFAULT: '#6366F1',         // Indigo for interactive elements
          hover: '#4F46E5',           // Darker on hover
          light: '#E0E7FF',           // Light tint for backgrounds
        },
      },
    },
  },
  plugins: [],
};
export default config;
