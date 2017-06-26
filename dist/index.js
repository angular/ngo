"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ngo_webpack_loader_1 = require("./ngo-webpack-loader");
exports.ngoLoader = ngo_webpack_loader_1.default;
var ngo_1 = require("./ngo");
exports.ngo = ngo_1.ngo;
var class_fold_1 = require("./class-fold");
exports.getFoldFileTransformer = class_fold_1.getFoldFileTransformer;
var prefix_functions_1 = require("./prefix-functions");
exports.getPrefixFunctionsTransformer = prefix_functions_1.getPrefixFunctionsTransformer;
var scrub_file_1 = require("./scrub-file");
exports.getScrubFileTransformer = scrub_file_1.getScrubFileTransformer;
var transform_javascript_1 = require("./transform-javascript");
exports.transformJavascript = transform_javascript_1.transformJavascript;
var purify_webpack_plugin_1 = require("./purify-webpack-plugin");
exports.PurifyPlugin = purify_webpack_plugin_1.PurifyPlugin;
var purify_1 = require("./purify");
exports.purify = purify_1.purify;
//# sourceMappingURL=index.js.map