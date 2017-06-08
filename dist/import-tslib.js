"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getImportTslibTransformer() {
    return function (context) {
        var transformer = function (sf) {
            var visitor = function (node) {
                // Check if node is a TS helper declaration.
                if (isTsHelper(node)) {
                    // Replace node with import for that helper.
                    return ts.visitEachChild(createTslibImport(node), visitor, context);
                }
                // Otherwise return node as is.
                return ts.visitEachChild(node, visitor, context);
            };
            return ts.visitNode(sf, visitor);
        };
        return transformer;
    };
}
exports.getImportTslibTransformer = getImportTslibTransformer;
function createTslibImport(node) {
    var name = getVariableStatementName(node);
    if (!name) {
        return node;
    }
    var namedImports = ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier(name))]);
    // typescript@next is needed for a fix to the function parameter types of ts.createImportClause.
    // https://github.com/Microsoft/TypeScript/pull/15999
    var importClause = ts.createImportClause(undefined, namedImports);
    var newNode = ts.createImportDeclaration(undefined, undefined, importClause, ts.createLiteral('tslib'));
    return newNode;
}
function isTsHelper(node) {
    if (node.kind !== ts.SyntaxKind.VariableStatement) {
        return false;
    }
    var varStmt = node;
    if (varStmt.declarationList.declarations.length > 1) {
        return false;
    }
    var varDecl = varStmt.declarationList.declarations[0];
    if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    var name = getVariableStatementName(node);
    if (!name) {
        return false;
    }
    // TODO: there are more helpers than these, should we replace them all?
    var tsHelpers = [
        '__extends',
        '__decorate',
        '__metadata',
        '__param',
    ];
    if (tsHelpers.indexOf(name) === -1) {
        return false;
    }
    // TODO: maybe add a few more checks, like checking the first part of the assignment.
    return true;
}
function getVariableStatementName(node) {
    var varStmt = node;
    if (varStmt.declarationList.declarations.length > 1) {
        return null;
    }
    var varDecl = varStmt.declarationList.declarations[0];
    if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
        return null;
    }
    var name = varDecl.name.text;
    // node.getText() on a name that starts with two underscores will return three instead.
    return name.replace(/^___/, '__');
}
//# sourceMappingURL=import-tslib.js.map