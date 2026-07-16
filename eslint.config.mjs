import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "deploy/**",
    // next-pwa がビルド時に public/ 配下へ生成する成果物(.gitignore と対応)
    "public/sw.js",
    "public/workbox-*.js",
    "public/swe-worker*.js",
    "public/fallback-*.js",
  ]),
]);

export default eslintConfig;
