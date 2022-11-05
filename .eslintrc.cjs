module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'LabeledStatement',
      'WithStatement',
    ],
    'no-shadow': 'off',
    'no-unused-vars': 'off',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'no-undef': 'off',
    'import/no-unresolved': 'off',
    'no-plusplus': 'off',
    'no-underscore-dangle': 'off',
  },
};
