"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var webpack_loader_1 = require("./ngo/webpack-loader");
exports.ngoLoader = webpack_loader_1.default;
var ngo_1 = require("./ngo/ngo");
exports.ngo = ngo_1.ngo;
var webpack_plugin_1 = require("./purify/webpack-plugin");
exports.PurifyPlugin = webpack_plugin_1.PurifyPlugin;
var purify_1 = require("./purify/purify");
exports.purify = purify_1.purify;
var transform_javascript_1 = require("./helpers/transform-javascript");
exports.transformJavascript = transform_javascript_1.transformJavascript;
var class_fold_1 = require("./transforms/class-fold");
exports.getFoldFileTransformer = class_fold_1.getFoldFileTransformer;
var prefix_functions_1 = require("./transforms/prefix-functions");
exports.getPrefixFunctionsTransformer = prefix_functions_1.getPrefixFunctionsTransformer;
var scrub_file_1 = require("./transforms/scrub-file");
exports.getScrubFileTransformer = scrub_file_1.getScrubFileTransformer;
var import_tslib_1 = require("./transforms/import-tslib");
exports.getImportTslibTransformer = import_tslib_1.getImportTslibTransformer;
//# sourceMappingURL=index.js.map