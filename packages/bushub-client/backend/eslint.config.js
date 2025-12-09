import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import nodePlugin from 'eslint-plugin-node';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    files: ['**/*.ts'],
    ignores: ['dist/**/*', 'node_modules/**/*', 'coverage/**/*', 'logs/**/*'],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      node: nodePlugin,
      prettier: prettierPlugin,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...eslintPluginTs.configs.recommended.rules,
      ...nodePlugin.configs.recommended.rules,

      // Prettier 통합
      'prettier/prettier': 'warn',

      // Import 순서 및 정리 (TypeScript resolver 없이)
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // 사용하지 않는 코드 관리
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // TypeScript 관련
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Node.js 관련
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-import': 'off',

      // 일반적인 코딩 스타일
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',

      // 함수 관련
      'prefer-arrow-callback': 'warn',
      'arrow-spacing': 'warn',
      'no-confusing-arrow': 'warn',

      // 객체/배열 관련
      'object-shorthand': 'warn',
      'prefer-destructuring': 'warn',

      // 조건문 관련
      'no-else-return': 'warn',
    },
  },
  // 테스트 파일을 위한 별도 설정
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: null, // 테스트 파일에서는 project 설정 비활성화
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      node: nodePlugin,
      prettier: prettierPlugin,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...eslintPluginTs.configs.recommended.rules,
      ...nodePlugin.configs.recommended.rules,

      // Prettier 통합
      'prettier/prettier': 'warn',

      // Import 순서 및 정리 (TypeScript resolver 없이)
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // 사용하지 않는 코드 관리
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // TypeScript 관련 (테스트에서는 더 관대하게)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Node.js 관련
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-import': 'off',

      // 일반적인 코딩 스타일
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',

      // 함수 관련
      'prefer-arrow-callback': 'warn',
      'arrow-spacing': 'warn',
      'no-confusing-arrow': 'warn',

      // 객체/배열 관련
      'object-shorthand': 'warn',
      'prefer-destructuring': 'warn',

      // 조건문 관련
      'no-else-return': 'warn',

      // 테스트 파일에서 허용하는 규칙들
      'node/no-unpublished-import': 'off',
      'node/no-unsupported-features/node-builtins': 'off',
    },
  },
];
