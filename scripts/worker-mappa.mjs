// Copia il worker di MapLibre in public/: il bundler di Next non lo include e senza la mappa non si disegna.
// Parte da solo prima di "npm run dev" e "npm run build".
import { copyFileSync } from "node:fs";

copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
console.log("ok public/maplibre-gl-worker.mjs");
