import { config } from "@deplit/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default {
  ...config,
  rules: { ...config.rules, "turbo/no-undeclared-env-vars": "off" },
};
