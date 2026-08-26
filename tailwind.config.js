/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14161A",
        muted: "#8A93A0",
        line: "#E7E9EC",
        panel: "#FAFAFB",
        red: { DEFAULT: "#B0413E" },
        amber: { DEFAULT: "#B8801F" },
        green: { DEFAULT: "#2F8F5B" },
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
