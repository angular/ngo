"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var ts = require("typescript");
var MagicString = require('magic-string');
exports.transformJavascript = function (options) {
    options.emitSourceMap = !!options.emitSourceMap;
    options.strict = !!options.strict;
    var content = options.content, getTransforms = options.getTransforms, emitSourceMap = options.emitSourceMap, inputFilePath = options.inputFilePath, outputFilePath = options.outputFilePath, strict = options.strict;
    // Print error diagnostics.
    var checkDiagnostics = function (diagnostics) {
        if (diagnostics && diagnostics.length > 0) {
            var errors = '';
            errors = errors + '\n' + ts.formatDiagnostics(diagnostics, {
                getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
                getNewLine: function () { return ts.sys.newLine; },
                getCanonicalFileName: function (f) { return f; },
            });
            return errors;
        }
    };
    // Make a in-memory host and populate it with a single file
    var fileMap = new Map();
    var sourcesMap = new Map();
    var outputs = new Map();
    // We're not actually writing anything to disk, but still need to define an outDir
    // because otherwise TS will fail to emit JS since it would overwrite the original.
    var tempOutDir = '$$_temp/';
    var tempFilename = 'ngo-default-file.js';
    fileMap.set(tempFilename, content);
    // We need to load the default lib for noEmitOnError to work properly.
    var defaultLibFileName = 'lib.d.ts';
    var defaultLibContent = fs_1.readFileSync(path_1.join(path_1.dirname(require.resolve('typescript')), defaultLibFileName), 'UTF-8');
    fileMap.set(defaultLibFileName, defaultLibContent);
    fileMap.forEach(function (v, k) { return sourcesMap.set(k, ts.createSourceFile(k, v, ts.ScriptTarget.ES2015)); });
    var host = {
        getSourceFile: function (fileName) { return sourcesMap.get(fileName); },
        getDefaultLibFileName: function () { return defaultLibFileName; },
        getCurrentDirectory: function () { return ''; },
        getDirectories: function () { return []; },
        getCanonicalFileName: function (fileName) { return fileName; },
        useCaseSensitiveFileNames: function () { return true; },
        getNewLine: function () { return '\n'; },
        fileExists: function (fileName) { return fileMap.has(fileName); },
        readFile: function (fileName) { return fileMap.has(fileName) ? fileMap.get(fileName) : ''; },
        writeFile: function (fileName, text) { return outputs.set(fileName, text); },
    };
    var tsOptions = {
        noEmitOnError: true,
        allowJs: true,
        // Using just line feed makes test comparisons easier, and doesn't matter for generated files.
        newLine: ts.NewLineKind.LineFeed,
        // We target next so that there is no downleveling.
        target: ts.ScriptTarget.ESNext,
        skipLibCheck: true,
        outDir: '$$_temp/',
        sourceMap: emitSourceMap,
        inlineSources: emitSourceMap,
        inlineSourceMap: false,
    };
    var program = ts.createProgram(Array.from(fileMap.keys()), tsOptions, host);
    // We need the checker inside transforms.
    var transforms = getTransforms.map(function (getTf) { return getTf(program); });
    var _a = program.emit(undefined, host.writeFile, undefined, undefined, { before: transforms, after: [] }), emitSkipped = _a.emitSkipped, diagnostics = _a.diagnostics;
    var transformedContent = outputs.get("" + tempOutDir + tempFilename);
    if (emitSkipped || !transformedContent) {
        // Throw only if we're in strict mode, otherwise return original content.
        if (strict) {
            throw new Error("\n        TS failed with the following error messages:\n\n        " + checkDiagnostics(diagnostics) + "\n      ");
        }
        else {
            return {
                content: content,
                sourceMap: !emitSourceMap ? null : new MagicString(content).generateMap({
                    source: inputFilePath,
                    file: outputFilePath ? outputFilePath + ".map" : null,
                    includeContent: true,
                }),
            };
        }
    }
    var sourceMap = null;
    if (emitSourceMap) {
        var tsSourceMap = outputs.get("" + tempOutDir + tempFilename + ".map");
        var urlRegExp = /^\/\/# sourceMappingURL=[^\r\n]*/gm;
        sourceMap = JSON.parse(tsSourceMap);
        // Fix sourcemaps file references.
        if (outputFilePath) {
            sourceMap.file = path_1.basename(outputFilePath);
            transformedContent = transformedContent.replace(urlRegExp, "//# sourceMappingURL=" + sourceMap.file + ".map\n");
            if (inputFilePath) {
                sourceMap.sources = [inputFilePath];
            }
            else {
                sourceMap.sources = [''];
            }
        }
        else {
            // TODO: figure out if we should inline sources here.
            transformedContent = transformedContent.replace(urlRegExp, '');
            sourceMap.file = '';
            sourceMap.sources = [''];
        }
    }
    return {
        content: transformedContent,
        sourceMap: sourceMap,
    };
};
//# sourceMappingURL=transform-javascript.js.map