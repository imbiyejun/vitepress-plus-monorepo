// Config loader - simplified version

import type { VitePressConfig } from '../types'

export function defineConfig(config: VitePressConfig): VitePressConfig {
  // For now, just return the config as-is
  // Will implement proper config loading and merging later
  return config
}

export { VitePressConfig, VitePlusPlusConfig } from '../types'

