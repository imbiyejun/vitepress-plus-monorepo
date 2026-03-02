import { spawn, SpawnOptions } from 'node:child_process'

export interface ExecResult {
  stdout: string
  stderr: string
  code: number
}

/**
 * Execute a command and return the result
 */
export async function exec(
  bin: string,
  args: readonly string[],
  opts: SpawnOptions = {}
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      ...opts,
      shell: true,
      stdio: opts.stdio === 'inherit' ? 'inherit' : 'pipe'
    })

    let stdout = ''
    let stderr = ''

    if (child.stdout) {
      child.stdout.on('data', data => {
        stdout += data.toString()
      })
    }

    if (child.stderr) {
      child.stderr.on('data', data => {
        stderr += data.toString()
      })
    }

    child.on('close', code => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 0
      })
    })

    child.on('error', reject)
  })
}
