import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import pico from 'picocolors'
import semver from 'semver'
import Enquirer from 'enquirer'
import { exec } from './utils.js'

const enquirer = new Enquirer()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const packagesDir = path.resolve(rootDir, 'packages')

interface Package {
  name: string
  version: string
  private?: boolean
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

interface PackageInfo {
  name: string
  dir: string
  pkg: Package
  shouldPublish: boolean
}

// Packages that should NOT be published to npm
const NO_PUBLISH_PACKAGES = ['vitepress-plus']

const { values: args } = parseArgs({
  allowPositionals: true,
  options: {
    // rc = development version, release = production version
    type: {
      type: 'string',
      short: 't',
      default: 'rc'
    },
    // patch | minor | major | next (next only for RC)
    bump: {
      type: 'string',
      short: 'b',
      default: 'patch'
    },
    dry: {
      type: 'boolean',
      default: false
    },
    skipGit: {
      type: 'boolean',
      default: false
    },
    skipBuild: {
      type: 'boolean',
      default: false
    },
    skipPrompts: {
      type: 'boolean',
      default: false
    }
  }
})

const isDryRun = args.dry
const skipGit = args.skipGit
const skipBuild = args.skipBuild
const skipPrompts = args.skipPrompts
const releaseType = args.type as 'rc' | 'release'
const bumpType = args.bump as 'patch' | 'minor' | 'major' | 'next'

let versionUpdated = false

const step = (msg: string) => console.log(pico.cyan(msg))

const run = async (
  bin: string,
  runArgs: readonly string[],
  opts: Parameters<typeof exec>[2] = {}
) => exec(bin, runArgs, { stdio: 'inherit', ...opts })

const dryRun = async (
  bin: string,
  runArgs: readonly string[],
  opts: Parameters<typeof exec>[2] = {}
) => {
  console.log(pico.blue(`[dryrun] ${bin} ${runArgs.join(' ')}`), opts)
  return { stdout: '', stderr: '', code: 0 }
}

const runIfNotDry = isDryRun ? dryRun : run

function getPackages(): PackageInfo[] {
  const dirs = fs.readdirSync(packagesDir).filter(p => {
    const pkgRoot = path.resolve(packagesDir, p)
    return (
      fs.statSync(pkgRoot).isDirectory() && fs.existsSync(path.resolve(pkgRoot, 'package.json'))
    )
  })

  return dirs.map(dir => {
    const pkgPath = path.resolve(packagesDir, dir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Package
    return {
      name: dir,
      dir: path.resolve(packagesDir, dir),
      pkg,
      shouldPublish: !pkg.private && !NO_PUBLISH_PACKAGES.includes(dir)
    }
  })
}

function getBaseVersion(): string {
  const adminPkgPath = path.resolve(packagesDir, 'vitepress-admin', 'package.json')
  const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, 'utf-8')) as Package
  return adminPkg.version
}

function calculateNextVersion(
  currentVersion: string,
  bump: 'patch' | 'minor' | 'major' | 'next',
  isRC: boolean
): string {
  const parsed = semver.parse(currentVersion)
  if (!parsed) {
    throw new Error(`Invalid version: ${currentVersion}`)
  }

  const baseVersion = `${parsed.major}.${parsed.minor}.${parsed.patch}`
  const currentPrerelease = parsed.prerelease
  const isCurrentRC = currentPrerelease.length > 0 && currentPrerelease[0] === 'rc'

  if (isRC) {
    if (bump === 'next') {
      // Increment RC number only (e.g., 0.1.0-rc.3 -> 0.1.0-rc.4)
      if (!isCurrentRC) {
        throw new Error('Cannot use "next" bump when current version is not an RC version')
      }
      const rcNum = typeof currentPrerelease[1] === 'number' ? currentPrerelease[1] : 0
      return `${baseVersion}-rc.${rcNum + 1}`
    }
    // Bump base version first, then add -rc.1
    const nextBase = semver.inc(baseVersion, bump) as string
    return `${nextBase}-rc.1`
  } else {
    // Production version logic
    if (bump === 'next') {
      throw new Error('"next" bump is only available for RC releases')
    }
    if (isCurrentRC) {
      // Currently RC, release as stable (remove prerelease)
      return baseVersion
    } else {
      // Already stable, bump version
      return semver.inc(baseVersion, bump) as string
    }
  }
}

function updatePackageVersion(pkgDir: string, version: string): void {
  const pkgPath = path.resolve(pkgDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

async function syncToRemote(): Promise<void> {
  step('\nSyncing to remote...')

  // Fetch latest from remote
  await runIfNotDry('git', ['fetch', 'origin'])

  // Get current branch
  const { stdout: branch } = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])

  // Pull latest changes
  step(`Pulling latest changes from ${branch}...`)
  await runIfNotDry('git', ['pull', 'origin', branch.trim()])
}

async function commitAndPush(version: string): Promise<void> {
  step('\nCommitting changes...')

  const { stdout: status } = await exec('git', ['status', '--porcelain'])

  if (status) {
    await runIfNotDry('git', ['add', '-A'])
    await runIfNotDry('git', ['commit', '-m', `"release: v${version}"`])

    const { stdout: branch } = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
    step(`Pushing to ${branch.trim()}...`)
    await runIfNotDry('git', ['push', 'origin', branch.trim()])
  } else {
    console.log('No changes to commit.')
  }
}

async function createAndPushTag(version: string): Promise<void> {
  step(`\nCreating tag v${version}...`)
  await runIfNotDry('git', ['tag', `v${version}`])

  step(`Pushing tag v${version} to remote...`)
  await runIfNotDry('git', ['push', 'origin', `v${version}`])
}

async function cleanPackages(packages: PackageInfo[]): Promise<void> {
  step('\nCleaning packages...')

  for (const pkg of packages) {
    if (pkg.shouldPublish) {
      const distPath = path.resolve(pkg.dir, 'dist')
      if (fs.existsSync(distPath)) {
        step(`Cleaning ${pkg.name}/dist...`)
        fs.rmSync(distPath, { recursive: true, force: true })
      }
    }
  }
}

async function buildPackages(packages: PackageInfo[]): Promise<void> {
  if (skipBuild) {
    step('\nSkipping build...')
    return
  }

  await cleanPackages(packages)

  step('\nBuilding packages...')

  for (const pkg of packages) {
    if (pkg.shouldPublish) {
      step(`Building ${pkg.name}...`)
      await run('pnpm', ['run', 'build'], { cwd: pkg.dir })
    }
  }
}

async function publishPackages(packages: PackageInfo[], version: string): Promise<void> {
  step('\nPublishing packages...')

  const isRC = version.includes('rc')
  const npmTag = isRC ? 'rc' : 'latest'

  for (const pkg of packages) {
    if (!pkg.shouldPublish) {
      console.log(pico.yellow(`Skipping ${pkg.name} (not publishable)`))
      continue
    }

    step(`Publishing ${pkg.pkg.name}@${version}...`)

    const publishArgs = ['publish', '--access', 'public', '--tag', npmTag, '--no-git-checks']

    if (isDryRun) {
      publishArgs.push('--dry-run')
    }

    try {
      await run('pnpm', publishArgs, { cwd: pkg.dir })
      console.log(pico.green(`Successfully published ${pkg.pkg.name}@${version}`))
    } catch (e) {
      const error = e as Error
      if (error.message?.includes('previously published')) {
        console.log(pico.red(`Skipping already published: ${pkg.pkg.name}`))
      } else {
        throw e
      }
    }
  }
}

async function main(): Promise<void> {
  const packages = getPackages()
  const currentVersion = getBaseVersion()
  const isRC = releaseType === 'rc'

  step(`Current version: ${currentVersion}`)
  step(`Release type: ${releaseType} (${isRC ? 'RC version' : 'Production version'})`)
  step(`Bump type: ${bumpType}`)

  const targetVersion = calculateNextVersion(currentVersion, bumpType, isRC)

  step(`\nTarget version: ${pico.bold(pico.green(targetVersion))}`)

  if (!skipPrompts) {
    const { yes: confirmRelease } = await enquirer.prompt<{ yes: boolean }>({
      type: 'confirm',
      name: 'yes',
      message: `Release v${targetVersion}?`
    })

    if (!confirmRelease) {
      console.log('Release cancelled.')
      return
    }
  }

  // 1. Sync code with remote
  if (!skipGit) {
    await syncToRemote()
  }

  // 2. Update all package versions
  step('\nUpdating package versions...')
  for (const pkg of packages) {
    updatePackageVersion(pkg.dir, targetVersion)
    console.log(`  ${pkg.name}: ${pkg.pkg.version} -> ${targetVersion}`)
  }
  versionUpdated = true

  // 3. Update pnpm-lock.yaml
  step('\nUpdating lockfile...')
  await run('pnpm', ['install', '--prefer-offline'])

  // 4. Build packages
  await buildPackages(packages)

  // 5. Publish packages
  await publishPackages(packages, targetVersion)

  // 6. Commit and push changes (after build to include any generated files)
  if (!skipGit) {
    await commitAndPush(targetVersion)
  }

  // 7. Create and push tag
  if (!skipGit) {
    await createAndPushTag(targetVersion)
  }

  console.log(pico.green(`\n✓ Successfully released v${targetVersion}!`))

  if (isDryRun) {
    console.log(pico.yellow('\nThis was a dry run. No actual changes were made.'))
  }
}

main().catch(err => {
  if (versionUpdated) {
    // Revert version on failed release
    const packages = getPackages()
    const currentVersion = getBaseVersion()
    console.log(pico.red('\nRelease failed, reverting versions...'))
    for (const pkg of packages) {
      updatePackageVersion(pkg.dir, currentVersion)
    }
  }
  console.error(pico.red(err))
  process.exit(1)
})
