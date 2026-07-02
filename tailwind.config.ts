import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f5f0e8",
        ink: "#1f2937",
        accent: "#8c5a32",
        accentSoft: "#f0d6c2",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(31, 41, 55, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;