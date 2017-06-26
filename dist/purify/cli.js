#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var purify_1 = require("./purify");
if (process.argv.length < 3 || process.argv.length > 4) {
    throw new Error("\n    purify should be called with either one or two arguments:\n\n      purify input.js\n      purify input.js output.js\n  ");
}
var currentDir = process.cwd();
var inputFile = process.argv[2];
var tsOrJsRegExp = /\.(j|t)s$/;
if (!inputFile.match(tsOrJsRegExp)) {
    throw new Error("Input file must be .js or .ts.");
}
// Use provided output file, or add the .ngo suffix before the extension.
var outputFile = process.argv[3] || inputFile.replace(tsOrJsRegExp, function (subStr) { return ".purify" + subStr; });
var purifyOutput = purify_1.purify(fs_1.readFileSync(path_1.join(currentDir, inputFile), 'UTF-8'));
fs_1.writeFileSync(path_1.join(currentDir, outputFile), purifyOutput);
//# sourceMappingURL=cli.js.map