import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import attributeLayout from './eslint-rules/attribute-layout.js';
import multilineTypeMembers from './eslint-rules/multiline-type-members.js';

const componentMacro = {
  selector: ':matches(ExpressionStatement, VariableDeclaration):has(CallExpression[callee.name=/^(defineProps|defineEmits|defineOptions)$/])',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    plugins: {
      '@stylistic': stylistic,
      'project-types': { rules: { 'multiline-members': multilineTypeMembers } },
    },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      curly: ['error', 'all'],
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      'no-restricted-syntax': ['error', {
        selector: 'ImportDeclaration[source.value=/\\.vue$/] > ImportDefaultSpecifier > Identifier:not([name=/^[A-Z][A-Za-z0-9]*$/])',
        message: 'Use PascalCase for component imports.',
      }],
      'project-types/multiline-members': 'error',
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-curly-newline': ['error', {
        TSTypeLiteral: { multiline: true, consistent: true },
        TSInterfaceBody: { multiline: true, consistent: true },
      }],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false },
      }],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'never', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: componentMacro, next: '*' },
        { blankLine: 'always', prev: '*', next: componentMacro },
      ],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
    },
  },
  {
    files: ['**/*.{ts,js}'],
    rules: {
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
    },
  },
  {
    files: ['src/**/*.{ts,vue}', 'tests/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['./*', '../*'], message: 'Use @/ or @assets/ aliases for frontend imports.' }],
      }],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    plugins: {
      project: {
        rules: {
          'attribute-layout': attributeLayout,
          'global-styles': {
            meta: {
              type: 'problem',
              schema: [],
              messages: { scoped: 'Use global Sass styles; scoped styles are not allowed.' },
            },
            create: (context) => ({
              Program: () => {
                const fragment = context.sourceCode.parserServices.getDocumentFragment?.();
                for (const block of fragment?.children ?? []) {
                  if (block.type !== 'VElement' || block.name !== 'style') {
                    continue;
                  }
                  for (const attribute of block.startTag.attributes) {
                    if (attribute.key.name === 'scoped') {
                      context.report({ node: attribute, messageId: 'scoped' });
                    }
                  }
                }
              },
            }),
          },
        },
      },
    },
    rules: {
      'project/global-styles': 'error',
      'project/attribute-layout': ['error', 150],
      'vue/component-name-in-template-casing': ['error', 'kebab-case', { registeredComponentsOnly: false }],
      'vue/multi-word-component-names': 'off',
      'vue/no-restricted-component-options': ['error', {
        name: 'name',
        message: 'Component names are inferred from filenames; do not set an explicit name.',
      }],
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/padding-line-between-blocks': ['error', 'always'],
      'vue/html-quotes': ['error', 'double'],
      'vue/object-curly-spacing': ['error', 'always'],
      'vue/mustache-interpolation-spacing': ['error', 'always'],
      'vue/html-self-closing': ['error', {
        html: { component: 'always', normal: 'any', void: 'any' },
        svg: 'any',
        math: 'any',
      }],
      'vue/html-closing-bracket-spacing': ['error', { selfClosingTag: 'always' }],
      'vue/script-indent': ['error', 2, { baseIndent: 1, switchCase: 1 }],
      'vue/html-indent': ['error', 2, { baseIndent: 1, alignAttributesVertically: false }],
      'vue/html-closing-bracket-newline': ['error', { singleline: 'never', multiline: 'always' }],
      'vue/block-lang': ['error', { script: { lang: 'ts' }, style: { lang: 'scss' } }],
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: { parser: vueParser },
    plugins: { project: { rules: { 'attribute-layout': attributeLayout } } },
    rules: { 'project/attribute-layout': ['error', 150] },
  },
];
