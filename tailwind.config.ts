import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        avante: {
          navy: "#0E1B3D",
          blue: "#16285c",
          accent: "#E23744",
          gold: "#F2B705",
        },
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
