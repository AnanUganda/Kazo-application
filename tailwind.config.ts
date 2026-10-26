import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kazo Technical School brand — maroon #710014 is the primary (brand-700).
        brand: {
          50: "#fdf2f3",
          100: "#fbe1e4",
          200: "#f6c7cd",
          300: "#ee9aa6",
          400: "#e26379",
          500: "#d13a54",
          600: "#b22441",
          700: "#710014",
          800: "#5f0012",
          900: "#4f0a16",
          950: "#2c0109",
          DEFAULT: "#710014",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
