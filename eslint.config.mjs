import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

// `defineConfig` from `eslint/config` replaced `tseslint.config(...)` as the
// recommended flat-config wrapper. Same behaviour, fewer indirections.
export default defineConfig(
  { ignores: ['node_modules/', 'dist/', 'out/', 'release/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
    },
    rules: {
      // Keep strict type-aware findings visible without turning the existing
      // codebase migration into this config-only alignment change.
      '@typescript-eslint/no-confusing-void-expression': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      '@typescript-eslint/no-unnecessary-type-parameters': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  // React-specific settings apply only to the renderer + anywhere that imports
  // JSX. Keeping it scoped avoids surfacing React rules in main/preload code.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      // We're on the new JSX transform \u2014 no need to import React.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      // The new hooks v7 rule flags every mount-time fetch / prefill pattern
      // as a cascading-render risk. Most of our usages here are intentional
      // one-shots (fetch on mount, apply a prefilled prompt once). Keep the
      // signal as a warning so genuine cascades still surface without
      // blocking CI on legitimate effects.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
);
