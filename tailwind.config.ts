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
        brand: {
          // HeartStamp crimson — used for all CTA buttons and focus rings
          red: "#BF2031",
          // Slightly darker for hover state (10% darkened)
          "red-hover": "#a01a28",
          // Very light tint for error/warning backgrounds
          "red-light": "#fdf2f3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
