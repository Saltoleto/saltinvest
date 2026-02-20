import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl2: "1.25rem"
      },
      boxShadow: {
        // Modernize-like soft elevation (lighter, less "foggy")
        soft: "0 10px 30px rgba(15,23,42,.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
