"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var source_map_1 = require("source-map");
var loaderUtils = require('loader-utils');
var ngo_1 = require("./ngo");
function ngoLoader(content, previousSourceMap) {
    this.cacheable();
    var options = loaderUtils.getOptions(this);
    var ngoOutput = ngo_1.ngo({ content: content, emitSourceMap: options.sourceMap });
    var intermediateSourceMap = ngoOutput.sourceMap;
    var newContent = ngoOutput.content;
    var newSourceMap = null;
    if (options.sourceMap && intermediateSourceMap) {
        // Webpack doesn't need sourceMappingURL since we pass them on explicitely.
        newContent = newContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
        if (!previousSourceMap) {
            // If we're emitting sourcemaps but there is no previous one, then we're the first loader.
            newSourceMap = intermediateSourceMap;
        }
        else {
            // If there's a previous sourcemap, we're an intermediate loader and we have to chain them.
            // Fill in the intermediate sourcemap source as the previous sourcemap file.
            intermediateSourceMap.sources = [previousSourceMap.file];
            intermediateSourceMap.file = previousSourceMap.file;
            // Chain the sourcemaps.
            var consumer = new source_map_1.SourceMapConsumer(intermediateSourceMap);
            var generator = source_map_1.SourceMapGenerator.fromSourceMap(consumer);
            generator.applySourceMap(new source_map_1.SourceMapConsumer(previousSourceMap));
            newSourceMap = generator.toJSON();
        }
    }
    this.callback(null, newContent, newSourceMap);
}
exports.default = ngoLoader;
// TODO: investigate weird extra maps at webpack:// root
// without ngo: main.bundle.js, vendor.bundle.js
// with ngo: app.module.ngfactory.js, main.bundle.js, null?37a6, vendor.bundle.js
//# sourceMappingURL=ngo-webpack-loader.js.map