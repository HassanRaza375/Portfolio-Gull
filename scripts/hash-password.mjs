// npm run hash-password
// Asks for a password (hidden, twice), prints the hash to put in ADMIN_PASSWORD_HASH. The password is never written to disk, a file or the shell history:
// it is not accepted as an argument, only typed in a terminal.
// Needs Node 22.18 or newer (it imports the TypeScript file the server also uses, so the two can never disagree about the format).
import { hashPassword } from '../server/utils/password.ts'

const MIN_LENGTH = 12

if (!process.stdin.isTTY) {
  console.error('Run this in a terminal: it asks for the password interactively and does not take it as an argument or from a pipe.')
  process.exit(1)
}

/** Reads one line without echoing it. */
function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    const stdin = process.stdin
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\u0003') { // Ctrl+C
          stdin.setRawMode(false)
          process.stdout.write('\n')
          process.exit(130)
        } else if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(value)
          return
        } else if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1)
        } else {
          value += ch
        }
      }
    }
    stdin.on('data', onData)
  })
}

const password = await askHidden(`New admin password (at least ${MIN_LENGTH} characters): `)
if (password.length < MIN_LENGTH) {
  console.error(`Too short: use at least ${MIN_LENGTH} characters.`)
  process.exit(1)
}
const again = await askHidden('Type it again: ')
if (again !== password) {
  console.error('The two passwords do not match.')
  process.exit(1)
}

const hash = await hashPassword(password)
console.log('\nAdd this line to .env (and to the Production variables in Vercel):\n')
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`)
console.log('The hash is safe to store; the password is not saved anywhere.')
