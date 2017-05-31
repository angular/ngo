"use strict";
var fs = require("fs");
var ts = require("typescript");
function prefixFunctions(file, name) {
    var contents = fs.readFileSync(file).toString();
    var options = {
        allowJs: true,
    };
    var program = ts.createProgram([file], options);
    var source = program.getSourceFile(file);
    var PURE_STRING = '/*@__PURE__*/';
    var topLevelPositions = findTopLevelFunctions(source);
    console.error(name + ": prefixing " + topLevelPositions.length + " top-level functions and new expressions");
    // Starting from the latest positions so they aren't shifted down when pure is inserted
    for (var i = topLevelPositions.length - 1; i >= 0; i--) {
        var currPos = topLevelPositions[i];
        contents = contents.substring(0, currPos) + PURE_STRING + contents.substring(currPos);
    }
    // Print out the paths of the import statements with explicit import clauses
    // so purify can prefix them with pure.
    var pureImports = findPureImports(source);
    console.error(name + ": printing " + pureImports.length + " safe imports");
    contents += "/** PURE_IMPORTS_START " + pureImports.join(',') + " PURE_IMPORTS_END */";
    return contents;
}
exports.prefixFunctions = prefixFunctions;
function findTopLevelFunctions(node) {
    var topLevelPositions = [];
    ts.forEachChild(node, cb);
    var previousNode;
    function cb(node) {
        // Stop recursing into this branch if it's a function expression or declaration
        if (node.kind === ts.SyntaxKind.FunctionDeclaration ||
            node.kind === ts.SyntaxKind.FunctionExpression) {
            return;
        }
        // We need to check specially for IIFEs formatted as call expressions inside parenthesized
        // expressions: `(function() {}())` Their start pos doesn't include the opening paren
        // and must be adjusted.
        if (isIIFE(node) && previousNode.kind === ts.SyntaxKind.ParenthesizedExpression) {
            topLevelPositions.push(node.pos - 1);
        }
        else if (node.kind === ts.SyntaxKind.CallExpression ||
            node.kind === ts.SyntaxKind.NewExpression) {
            topLevelPositions.push(node.pos);
        }
        previousNode = node;
        return ts.forEachChild(node, cb);
    }
    function isIIFE(node) {
        return node.kind === ts.SyntaxKind.CallExpression && !node.expression.text &&
            node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression;
    }
    return topLevelPositions;
}
exports.findTopLevelFunctions = findTopLevelFunctions;
function findPureImports(node) {
    var pureImports = [];
    ts.forEachChild(node, cb);
    function cb(node) {
        if (node.kind === ts.SyntaxKind.ImportDeclaration && node.importClause) {
            // Save the path of the import transformed into snake case
            pureImports.push(node.moduleSpecifier.text.replace(/[\/@\-]/g, '_'));
        }
        return ts.forEachChild(node, cb);
    }
    return pureImports;
}
exports.findPureImports = findPureImports;
