#!/usr/bin/env node

import { createCLI } from '../dist/index.js'

const program = createCLI()
program.parse(process.argv)
