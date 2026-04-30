import nextConfig from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'coverage/**',
    ],
  },
  ...nextConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'react/jsx-props-no-spreading': 'off',
      'react/require-default-props': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'import/prefer-default-export': 'off',
      'import/extensions': 'off',
      'no-case-declarations': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'no-plusplus': 'off',
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'always-multiline',
      }],
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          'test/**',
          '**/*.{test,spec}.{ts,tsx}',
          'vitest.config.{ts,js}',
          'eslint.config.{mjs,js}',
        ],
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
