import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl2: "1.25rem"
      },
      boxShadow: {
        // light theme friendly "Material-like" elevation
        soft: "0 18px 45px rgba(2, 6, 23, .10)"
      }
    }
  },
  plugins: []
} satisfies Config;
