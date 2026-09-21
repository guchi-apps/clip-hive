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
  // 共有 Supabase では scope 省略の signOut() が他アプリのセッションまで失効させるため、
  // signOut の直接呼び出しを禁止して src/lib/supabase/sign-out.ts の signOutLocal に寄せる。
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='signOut']",
          message:
            "signOut() を直接呼ばない。scope 省略は global 扱いで他アプリのセッションを失効させるため、signOutLocal() を使う。",
        },
      ],
    },
  },
  {
    files: ["src/lib/supabase/sign-out.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
]);

export default eslintConfig;
