import { reactConfig } from "@deplit/eslint-config/react";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";

/** @type {import("eslint").Linter.Config} */
export default [
  ...reactConfig,
  ...pluginQuery.configs["flat/recommended"],
  ...pluginRouter.configs["flat/recommended"],
];
