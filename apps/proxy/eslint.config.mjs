import { config } from "@deplit/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    ignores: [".wrangler/**"],
  },
];
