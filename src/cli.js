#!/usr/bin/env node

const program = require("commander");

const { blocks, Checker } = require("./index");

const log = console.log;

program
    .version("0.1.0")
    .usage("[options] <color0> <color1>")
    .option("--skipTests <testId>", "Test ids to skip")
    .option("-x, --failFast", "Throw exception on first warning")
    .parse(process.argv);

result = new Checker(program.args[0], program.args[1], {
    failFast: program.failFast || false,
    skipTests: program.skipTests || []
}).check();
