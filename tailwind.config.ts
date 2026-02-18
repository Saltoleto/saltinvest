import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl2: "1.25rem"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0,0,0,.25)"
      }
    }
  },
  plugins: []
} satisfies Config;
