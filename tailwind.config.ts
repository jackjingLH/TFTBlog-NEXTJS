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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 主强调色 - 橙色系
        primary: {
          400: '#FFA500',
          500: '#FF8500',
          600: '#FF6B00',
        },
        // 深色背景系
        bgDark: {
          500: '#232339', // 最浅的卡片背景
          600: '#2d2d44', // 次要元素背景
          700: '#1a1a2e', // 主要卡片背景
          800: '#0f1419', // 主背景
        },
        // 浅色文字系
        textLight: {
          100: '#FFFFFF', // 主文字
          200: '#B4B4C5', // 次文字
          300: '#7E7E8F', // 辅助文字
        },
        // 边框色
        border: '#2d2d44',
      },
    },
  },
  plugins: [],
};
export default config;
