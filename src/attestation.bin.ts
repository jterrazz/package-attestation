#!/usr/bin/env node
import { runCli } from './cli/dispatch.js';

process.exit(await runCli(process.argv.slice(2)));
