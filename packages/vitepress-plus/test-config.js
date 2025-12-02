// Test configuration loader
import { loadConfig } from './dist/config/index.js'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

async function test() {
  try {
    console.log('Testing configuration loader...\n')
    
    // Test loading from examples/docs
    const examplesPath = join(__dirname, '../../examples/docs')
    console.log(`Loading config from: ${examplesPath}`)
    
    const config = await loadConfig(examplesPath)
    
    console.log('\n✅ Configuration loaded successfully!')
    console.log('\nConfiguration:')
    console.log(JSON.stringify(config, null, 2))
    
  } catch (error) {
    console.error('❌ Error loading configuration:', error)
    process.exit(1)
  }
}

test()

