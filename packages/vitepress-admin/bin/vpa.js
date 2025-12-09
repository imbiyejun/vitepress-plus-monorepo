#!/usr/bin/env node

import { createCLI } from '../dist/cli/index.js'

const program = createCLI()
program.parse(process.argv)
