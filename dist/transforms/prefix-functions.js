"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getPrefixFunctionsTransformer() {
    return function (context) {
        var transformer = function (sf) {
            var pureFunctionComment = '@__PURE__';
            var topLevelFunctions = findTopLevelFunctions(sf);
            var pureImports = findPureImports(sf);
            var pureImportsComment = "* PURE_IMPORTS_START " + pureImports.join(',') + " PURE_IMPORTS_END ";
            var visitor = function (node) {
                // Add the pure imports comment to the first node.
                if (node.parent && node.parent.parent === undefined && node.pos === 0) {
                    var newNode = ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, pureImportsComment, true);
                    // Replace node with modified one.
                    return ts.visitEachChild(newNode, visitor, context);
                }
                // Add pure function comment to top level functions.
                if (topLevelFunctions.indexOf(node) !== -1) {
                    var newNode = ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false);
                    // Replace node with modified one.
                    return ts.visitEachChild(newNode, visitor, context);
                }
                // Otherwise return node as is.
                return ts.visitEachChild(node, visitor, context);
            };
            return ts.visitNode(sf, visitor);
        };
        return transformer;
    };
}
exports.getPrefixFunctionsTransformer = getPrefixFunctionsTransformer;
function findTopLevelFunctions(parentNode) {
    var topLevelFunctions = [];
    ts.forEachChild(parentNode, cb);
    var previousNode;
    function cb(node) {
        // Stop recursing into this branch if it's a function expression or declaration
        if (node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.FunctionExpression) {
            return;
        }
        // We need to check specially for IIFEs formatted as call expressions inside parenthesized
        // expressions: `(function() {}())` Their start pos doesn't include the opening paren
        // and must be adjusted.
        if (isIIFE(node) && previousNode.kind === ts.SyntaxKind.ParenthesizedExpression && node.parent) {
            topLevelFunctions.push(node.parent);
        }
        else if (node.kind === ts.SyntaxKind.CallExpression || node.kind === ts.SyntaxKind.NewExpression) {
            topLevelFunctions.push(node);
        }
        previousNode = node;
        return ts.forEachChild(node, cb);
    }
    function isIIFE(node) {
        return node.kind === ts.SyntaxKind.CallExpression && !node.expression.text &&
            node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression;
    }
    return topLevelFunctions;
}
exports.findTopLevelFunctions = findTopLevelFunctions;
function findPureImports(parentNode) {
    var pureImports = [];
    ts.forEachChild(parentNode, cb);
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
//# sourceMappingURL=prefix-functions.js.map