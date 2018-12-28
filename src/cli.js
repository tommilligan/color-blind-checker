#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');

const colorBlindChecker = require('./index');

const log = console.log;

program
  .version('0.1.0')
  .usage('[options] <color0> <color1>')
  .option('--text', 'Treat colors as text and background values')
  .parse(process.argv);

result = new colorBlindChecker.Checker(
  program.args[0],
  program.args[1],
).check();

//console.log(JSON.stringify(result, null, 3));

function blockOf(color) {
  return chalk.bgHex(color)('  ');
}

function warnFilter(filterName, warning) {
  log(`${chalk.bold(`Warning (${filterName}):`)} ${warning}`);
}

for (const filter of Object.keys(result.filters)) {
  const warn = warning => warnFilter(filter, warning);
  const filterResult = result.filters[filter];

  log(
    `Checked ${blockOf(filterResult.colors[0])}${blockOf(
      filterResult.colors[1],
    )} (${filter})`,
  );

  if (program.text && filterResult.warnings.lowContrast) {
    warn(
      `Too low contrast for text (${chalk
        .hex(filterResult.colors[0])
        .bgHex(filterResult.colors[1])('sample')})`,
    );
  }
  if (filterResult.warnings.informationLoss) {
    warn('Colors are much closer than with full color vision');
  }
  if (filterResult.warnings.indistinguishable) {
    warn('Colors are functionally indistinguishable');
  }
}
