#!/usr/bin/env node

const program = require("commander");

const colorBlindChecker = require("./index");

program
    .version("0.1.0")
    .option("-0, --color0 <color>", "color 0")
    .option("-1, --color1 <color>", "color 1")
    .parse(process.argv);

result = new colorBlindChecker.Checker(program.color0, program.color1).check();

console.log(JSON.stringify(result, null, 3));
