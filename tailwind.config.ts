import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#b7e44b",
        "background-dark": "#0f1115",
        "background-light": "#f5f6f8"
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["DM Serif Display", "serif"]
      },
      borderRadius: {
        DEFAULT: "1.5rem",
        lg: "1.5rem",
        xl: "1.5rem",
        full: "9999px"
      }
    }
  },
  plugins: []
};

export default config;
