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
        // 主强调色 - 霓虹紫系
        primary: {
          400: '#A78BFA', // 紫色浅
          500: '#7C3AED', // 霓虹紫主色
          600: '#6D28D9', // 紫色深
        },
        // 深色背景系
        bgDark: {
          500: '#2D2B6F', // 最浅元素
          600: '#1E1B4B', // 次要元素背景
          700: '#16213E', // 卡片背景
          800: '#0F0F23', // 主背景（更深更蓝）
        },
        // 浅色文字系
        textLight: {
          100: '#FFFFFF', // 主文字
          200: '#B4B4C5', // 次文字
          300: '#7E7E8F', // 辅助文字
        },
        // 边框色
        border: '#3730A3', // 带紫色调边框
        // 玫红 CTA 色
        accent: {
          500: '#F43F5E',
          600: '#E11D48',
        },
      },
    },
  },
  plugins: [],
};
export default config;
