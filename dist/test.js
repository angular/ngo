"use strict";
var fs = require("fs");
var ngo_1 = require("./ngo");
var class_fold_1 = require("./class-fold");
var file = process.argv[2];
var tmp = file + '.tmp.js';
fs.writeFileSync(tmp, ngo_1.scrubFile(file, file));
process.stdout.write(class_fold_1.foldFile(tmp, file));
fs.unlinkSync(tmp);
