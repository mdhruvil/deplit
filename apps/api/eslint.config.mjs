import { config } from "@deplit/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ignores: [".wrangler/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
];
