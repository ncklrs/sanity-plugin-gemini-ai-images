import tseslint from 'typescript-eslint'

export default [
  {ignores: ['**/dist/**', '**/node_modules/**']},
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
    },
  },
]
