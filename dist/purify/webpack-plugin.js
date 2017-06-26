"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var purify_1 = require("./purify");
var PurifyPlugin = (function () {
    function PurifyPlugin() {
    }
    PurifyPlugin.prototype.apply = function (compiler) {
        compiler.plugin('compilation', function (compilation) {
            compilation.plugin('optimize-chunk-assets', function (chunks, callback) {
                chunks.forEach(function (chunk) {
                    chunk.files.filter(function (fileName) { return fileName.endsWith('.bundle.js'); }).forEach(function (fileName) {
                        var purifiedSource = purify_1.purify(compilation.assets[fileName].source());
                        compilation.assets[fileName]._cachedSource = purifiedSource;
                        compilation.assets[fileName]._source.source = function () { return purifiedSource; };
                    });
                });
                callback();
            });
        });
    };
    return PurifyPlugin;
}());
exports.PurifyPlugin = PurifyPlugin;
//# sourceMappingURL=webpack-plugin.js.map