#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var ngo_1 = require("./ngo");
if (process.argv.length < 3 || process.argv.length > 4) {
    throw new Error("\n    ngo should be called with either one or two arguments:\n\n      ngo input.js\n      ngo input.js output.js\n  ");
}
var currentDir = process.cwd();
var inputFile = process.argv[2];
var tsOrJsRegExp = /\.(j|t)s$/;
if (!inputFile.match(tsOrJsRegExp)) {
    throw new Error("Input file must be .js or .ts.");
}
// Use provided output file, or add the .ngo suffix before the extension.
var outputFile = process.argv[3] || inputFile.replace(tsOrJsRegExp, function (subStr) { return ".ngo" + subStr; });
var ngoOutput = ngo_1.ngo({
    inputFilePath: path_1.join(currentDir, inputFile),
    outputFilePath: path_1.join(currentDir, outputFile),
    emitSourceMap: true,
});
fs_1.writeFileSync(path_1.join(currentDir, outputFile), ngoOutput.content);
fs_1.writeFileSync(path_1.join(currentDir, outputFile + ".map"), JSON.stringify(ngoOutput.sourceMap));
//# sourceMappingURL=ngo-cli.js.map