import { defineConfig } from "vitest/config";

// Frontend-Tests laufen bewusst ohne den vollen SvelteKit-Plugin-Stack, damit
// das reine Sende- und Render-Verhalten schnell und deterministisch geprüft
// werden kann. Schwergewichtige UI-Bibliotheken (Canvas, Editor) werden in den
// Tests nicht geladen.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"]
  }
});
