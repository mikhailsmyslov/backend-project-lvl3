#!/usr/bin/env node

import program from 'commander';
import pageLoader from '..';
import { getPageName } from '../utils';
import { version } from '../../package.json';

program
  .version(version)
  .description('Downloads specified URL from the internet')
  .arguments('<url>')
  .option('-o, --output [directory]', 'output directory', process.cwd())
  .action((url) => {
    pageLoader(url, program.output)
      .then(() => console.log(`"${url}" successfully downloaded at "${program.output}" as "${getPageName(url)}"`))
      .catch((err) => {
        console.error(`${err.message}`);
        process.exitCode = 1;
      });
  });

program.parse(process.argv);

if (program.args.length === 0) program.help();
