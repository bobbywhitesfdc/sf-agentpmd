import {includeIgnoreFile} from '@eslint/compat'
import oclif from 'eslint-config-oclif'
import prettier from 'eslint-config-prettier'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore')

export default [
  includeIgnoreFile(gitignorePath),
  ...oclif,
  prettier,
  {
    rules: {
      // AgentScript procedure-kind identifiers are snake_case (before_reasoning, after_reasoning, available_when, reasoning_instructions).
      camelcase: 'off',
      // multiple describe() blocks per test file is fine here.
      'mocha/max-top-level-suites': 'off',
      // ANTLR-generated parser accessor methods start with an uppercase letter.
      'new-cap': 'off',
      // sequential filesystem walks are intentional and ordered.
      'no-await-in-loop': 'off',
    },
  },
]
