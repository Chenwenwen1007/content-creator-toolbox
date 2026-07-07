/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "960px",
      },
    },
    extend: {
      colors: {
        cream: {
          50: "#FBF9F5",
          100: "#F7F3EC",
          200: "#EFE8DA",
          300: "#E3D9C5",
        },
        ink: {
          900: "#1A1A1A",
          700: "#4A4A4A",
          500: "#7A7A7A",
          300: "#B0B0B0",
        },
        amber: {
          accent: "#C8763A",
          light: "#D99A6C",
          dark: "#A85D2A",
        },
        moss: {
          DEFAULT: "#5C6B4A",
          light: "#7A8B65",
        },
        brick: {
          DEFAULT: "#A8442A",
          light: "#C45F45",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"PingFang SC"', '"Microsoft YaHei"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 16px rgba(26, 26, 26, 0.06)",
        "card-hover": "0 8px 32px rgba(26, 26, 26, 0.1)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
