export default [
  { files: ['src/**/*.js'] },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', console: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-redeclare': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
    },
  },
];
