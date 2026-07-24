/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f8fb",
          100: "#ebeef5",
          200: "#d7deeb",
          500: "#64748b",
          700: "#334155",
          900: "#111827"
        },
        wasp: {
          100: "#fff4bf",
          300: "#f4d35e",
          500: "#d9a900",
          700: "#8a6a00"
        },
        mint: {
          100: "#dff7ee",
          500: "#2f9f74",
          700: "#1f6f52"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "SFMono-Regular", "Consolas", "monospace"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(17, 24, 39, 0.12)"
      }
    }
  }
};
