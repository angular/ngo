"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var MagicString = require('magic-string');
var class_fold_1 = require("./class-fold");
var scrub_file_1 = require("./scrub-file");
var transform_javascript_1 = require("./transform-javascript");
var HAS_DECORATORS = /decorators/;
var HAS_CTOR_PARAMETERS = /ctorParameters/;
function ngo(options) {
    options.emitSourceMap = !!options.emitSourceMap;
    var inputFilePath = options.inputFilePath, emitSourceMap = options.emitSourceMap, outputFilePath = options.outputFilePath, strict = options.strict;
    var content = options.content;
    if (!inputFilePath && !content) {
        throw new Error('Either filePath or content must be specified in options.');
    }
    if (!content) {
        content = fs_1.readFileSync(inputFilePath, 'UTF-8');
    }
    if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
        return transform_javascript_1.transformJavascript({
            content: content,
            getTransforms: [scrub_file_1.getScrubFileTransformer, class_fold_1.getFoldFileTransformer],
            emitSourceMap: emitSourceMap,
            inputFilePath: inputFilePath,
            outputFilePath: outputFilePath,
            strict: strict,
        });
    }
    if (emitSourceMap) {
        // Emit a sourcemap with no changes.
        var ms = new MagicString(content);
        return {
            content: content,
            sourceMap: ms.generateMap({
                source: inputFilePath,
                file: outputFilePath ? outputFilePath + ".map" : null,
                includeContent: true,
                hires: true,
            }),
        };
    }
    else {
        return {
            content: content,
            sourceMap: null,
        };
    }
}
exports.ngo = ngo;
//# sourceMappingURL=ngo.js.map