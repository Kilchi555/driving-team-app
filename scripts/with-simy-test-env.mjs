#!/usr/bin/env node
/**
 * Run a command with simy-test credentials loaded from ~/.config/simy/simy-test.env.
 * Secret values are never printed.
 *
 * Usage:
 *   node scripts/with-simy-test-env.mjs --profile nuxt-dev -- nuxt dev
 *   node scripts/with-simy-test-env.mjs --profile e2e -- playwright test
 *   node scripts/with-simy-test-env.mjs --profile all -- <command> [args...]
 */
import { spawn } from 'node:child_process'
import { emitSimyTestEnvWarnings, loadSimyTestEnv } from './load-simy-test-env.mjs'

const args = process.argv.slice(2)
const separator = args.indexOf('--')
const flags = separator === -1 ? args : args.slice(0, separator)
const command = separator === -1 ? [] : args.slice(separator + 1)

let profile = 'all'
for (let index = 0; index < flags.length; index += 1) {
  const flag = flags[index]
  if (flag === '--profile') {
    profile = flags[index + 1]
    index += 1
    continue
  }
  if (flag.startsWith('--profile=')) {
    profile = flag.slice('--profile='.length)
    continue
  }
  console.error('Usage: node scripts/with-simy-test-env.mjs --profile nuxt-dev|e2e|all -- <command> [args...]')
  process.exit(2)
}

if (command.length === 0) {
  console.error('Usage: node scripts/with-simy-test-env.mjs --profile nuxt-dev|e2e|all -- <command> [args...]')
  process.exit(2)
}

const result = loadSimyTestEnv({ profile })
emitSimyTestEnvWarnings(result)
if (result.fatal) process.exit(1)

process.env.SIMY_TEST_ENV_CHECKED = '1'
const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code === null ? 1 : code)
})
child.on('error', () => {
  console.error('Failed to start command')
  process.exit(1)
})
