#!/usr/bin/env node

const chalk = require("chalk");
const program = require("commander");

const colorBlindChecker = require("./index");

const log = console.log;

program
    .version("0.1.0")
    .option("-0, --color0 <color>", "color 0")
    .option("-1, --color1 <color>", "color 1")
    .option("--text", "Treat colors as text and background values")
    .parse(process.argv);

result = new colorBlindChecker.Checker(program.color0, program.color1).check();

//console.log(JSON.stringify(result, null, 3));

function blockOf(color) {
    return chalk.hex(color)("██");
}

function warn(warning) {
    log(`${chalk.bold("Warning: ")} ${warning}`);
}

for (const filter of Object.keys(result.filters)) {
    filterResult = result.filters[filter];

    log(
        `Checked ${filter}: ${blockOf(filterResult.colors[0])}${blockOf(
            filterResult.colors[1]
        )}`
    );

    if (program.text && filterResult.warnings.lowContrast) {
        warn("Too low contrast for text");
    }
    if (filterResult.warnings.informationLoss) {
        warn("Colors are much closer than with full color vision");
    }
    if (filterResult.warnings.indistinguishable) {
        warn("Colors are functionally indistinguishable");
    }
}
