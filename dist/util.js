"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
exports.transformJavascript = function (content, getTransforms) {
    // Print error diagnostics.
    var checkDiagnostics = function (diagnostics) {
        if (diagnostics && diagnostics.length > 0) {
            console.error(ts.formatDiagnostics(diagnostics, {
                getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
                getNewLine: function () { return ts.sys.newLine; },
                getCanonicalFileName: function (f) { return f; }
            }));
        }
    };
    // Make a in-memory host and populate it with a single file
    var fileMap = new Map();
    var sourcesMap = new Map();
    var outputs = new Map();
    // We're not actually writing anything to disk, but still need to define an outDir
    // because otherwise TS will fail to emit JS since it would overwrite the original.
    var tempOutDir = '$$_temp/';
    var tempFilename = 'test.js';
    fileMap.set(tempFilename, content);
    fileMap.forEach(function (v, k) { return sourcesMap.set(k, ts.createSourceFile(k, v, ts.ScriptTarget.ES2015)); });
    var host = {
        getSourceFile: function (fileName) { return sourcesMap.get(fileName); },
        getDefaultLibFileName: function () { return 'lib.d.ts'; },
        getCurrentDirectory: function () { return ''; },
        getDirectories: function () { return []; },
        getCanonicalFileName: function (fileName) { return fileName; },
        useCaseSensitiveFileNames: function () { return true; },
        getNewLine: function () { return '\n'; },
        fileExists: function (fileName) { return fileMap.has(fileName); },
        readFile: function (fileName) { return fileMap.has(fileName) ? fileMap.get(fileName) : ''; },
        writeFile: function (fileName, text) { return outputs.set(fileName, text); },
    };
    var options = {
        allowJs: true,
        // Using just line feed makes test comparisons easier, and doesn't matter for generated files.
        newLine: ts.NewLineKind.LineFeed,
        // We target next so that there is no downleveling.
        target: ts.ScriptTarget.ESNext,
        skipLibCheck: true,
        outDir: '$$_temp/'
    };
    var compilerHost = ts.createCompilerHost(options);
    var program = ts.createProgram(Array.from(fileMap.keys()), options, host);
    // We need the checker inside transforms.
    var transforms = getTransforms.map(function (getTf) { return getTf(program); });
    var _a = program.emit(undefined, host.writeFile, undefined, undefined, { before: transforms, after: [] }), emitSkipped = _a.emitSkipped, diagnostics = _a.diagnostics;
    checkDiagnostics(diagnostics);
    var transformedContent = outputs.get(tempOutDir + tempFilename);
    if (emitSkipped || !transformedContent) {
        throw new Error('TS compilation was not successfull.');
    }
    return transformedContent;
};
function expect(node, kind) {
    if (node.kind !== kind) {
        throw 'Invalid!';
    }
    return node;
}
exports.expect = expect;
function lookup(node, key) {
    return node
        .properties
        .reduce(function (result, prop) {
        if (result !== null) {
            return result;
        }
        if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
            return null;
        }
        var assign = prop;
        if (assign.name.kind !== ts.SyntaxKind.StringLiteral) {
            return null;
        }
        var lit = assign.name;
        if (lit.text !== key) {
            return null;
        }
        return assign.initializer;
    }, null);
}
exports.lookup = lookup;
