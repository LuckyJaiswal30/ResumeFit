import js from '@eslint/js'
import react from '@eslint-react/eslint-plugin'
import next from '@next/eslint-plugin-next'
import { defineConfig, globalIgnores } from 'eslint/config'
import hooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      react.configs['recommended-typescript'],
      react.configs.rsc,
      hooks.configs.flat['recommended-latest'],
      next.configs.recommended,
      next.configs['core-web-vitals'],
    ],
    rules: {
      '@eslint-react/rules-of-hooks': 'off',
    },
  },
])
