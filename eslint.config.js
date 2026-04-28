import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules", "dist"]),
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      ecmaVersion: 2020,
      globals: globals.browser,
    },

    rules: {
      "no-extra-boolean-cast": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
  },
]);
