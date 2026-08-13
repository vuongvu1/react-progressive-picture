import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default ts.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ts.configs.recommended,
  reactHooks.configs.flat.recommended,
);
