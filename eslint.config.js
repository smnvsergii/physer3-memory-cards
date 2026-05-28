// ESLint v9 flat config.
// Type-aware linting for src/, plain TS parser for root config files.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: ['dist', 'node_modules', 'public', 'coverage'],
    },
    js.configs.recommended,

    // Type-aware rules apply only to the application source.
    {
        files: ['src/**/*.{ts,tsx}'],
        extends: [
            ...tseslint.configs.recommendedTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            globals: { ...globals.browser },
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        },
    },

    // Root-level TS configs (vite.config.ts) use the TS parser without
    // type-aware rules, so we don't need to add them to tsconfig include.
    {
        files: ['*.ts'],
        extends: [tseslint.configs.recommended],
        languageOptions: {
            globals: { ...globals.node },
        },
    },

    // JS config files (eslint.config.js) — disable type-aware rules entirely.
    {
        files: ['*.js'],
        languageOptions: {
            globals: { ...globals.node },
        },
        ...tseslint.configs.disableTypeChecked,
    },

    prettier,
);
