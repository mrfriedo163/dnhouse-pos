import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#102A43",
          fg: "#ffffff"
        },
        navy: "#102A43",
        skySoft: "#E6F4FF",
        page: "#F8FAFC",
        promo: "#F97316"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(16, 42, 67, 0.08)",
        lift: "0 24px 70px rgba(16, 42, 67, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
