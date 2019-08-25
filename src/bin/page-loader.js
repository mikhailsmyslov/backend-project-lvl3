#!/usr/bin/env node

import program from 'commander';
import pageLoader from '..';
import { version } from '../../package.json';

program
  .version(version)
  .description('Downloads specified URL from the internet')
  .arguments('<url>')
  .option('-o, --output [directory]', 'output directory')
  .action((url) => pageLoader(url, program.output));

program.parse(process.argv);

if (program.args.length === 0) program.help();
