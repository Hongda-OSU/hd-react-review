// Only rules that map to a rule id are enabled; no recommended presets.
// Severity here only shapes raw ESLint output: must -> error, should/suggest -> warn.
// The report takes its severity from the rule files, not from this config.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import stylex from '@stylexjs/eslint-plugin';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);

const prettierOptions = JSON.parse(readFileSync(new URL('./prettier.json', import.meta.url), 'utf8'));

// eslint-module-utils loads resolvers by name from the linted file's location, where the
// reviewed project may not have it. An absolute path always resolves to rr's own copy.
const tsResolver = require.resolve('eslint-import-resolver-typescript');

const LAYERS = ['atoms', 'molecules', 'organisms', 'templates', 'pages'];

// Each layer may import itself and the layers below it, never the ones above.
const upwardImports = LAYERS.slice(0, -1).map((layer, i) => ({
  from: { element: { type: layer } },
  disallow: { to: { element: { types: { anyOf: LAYERS.slice(i + 1) } } } },
}));

export default [
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/.next/**'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@stylexjs': stylex,
      '@typescript-eslint': tseslint.plugin,
      boundaries,
      'jsx-a11y': jsxA11y,
      prettier,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      // None of the enabled react rules depend on the version, and 'detect' warns on
      // every run when the reviewed project has no node_modules (fixtures included).
      react: { version: '19.0' },
      'boundaries/elements': LAYERS.map((layer) => ({
        type: layer,
        pattern: `src/components/${layer}/**`,
        partialMatch: false,
      })),
      'import/resolver': { [tsResolver]: { alwaysTryTypes: true } },
    },
    rules: {
      // R01
      'func-style': ['warn', 'expression'],
      'react/function-component-definition': [
        'warn',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],

      // R02 (bin/lint.mjs turns this off when the project has its own Prettier config)
      'prettier/prettier': ['warn', prettierOptions, { usePrettierrc: false }],

      // R05
      'boundaries/dependencies': ['warn', { default: 'allow', policies: upwardImports }],

      // R06
      'react/jsx-pascal-case': 'error',

      // R09
      '@stylexjs/valid-styles': 'warn',

      // R10
      'react-hooks/set-state-in-effect': 'warn',

      // R11
      'react/no-array-index-key': 'error',

      // R13
      'react/no-unstable-nested-components': 'error',

      // R16
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',

      // R17
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/alt-text': 'error',

      // R18
      'jsx-a11y/interactive-supports-focus': 'error',

      // R19
      '@typescript-eslint/no-explicit-any': 'warn',

      // R20
      'react/no-danger': 'error',

      // R23
      'react-hooks/rules-of-hooks': 'error',

      // R24
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
