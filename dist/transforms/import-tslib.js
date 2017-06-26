"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getImportTslibTransformer() {
    return function (context) {
        var transformer = function (sf) {
            // Check if module has CJS exports. If so, use 'require()' instead of 'import'.
            var useRequire = /exports.\S+\s*=/.test(sf.getText());
            var visitor = function (node) {
                // Check if node is a TS helper declaration.
                if (isTsHelper(node)) {
                    // Replace node with import for that helper.
                    return ts.visitEachChild(createTslibImport(node, useRequire), visitor, context);
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
function createTslibImport(node, useRequire) {
    if (useRequire === void 0) { useRequire = false; }
    var name = getVariableStatementName(node);
    if (!name) {
        return node;
    }
    if (useRequire) {
        // Use `var __helper = /*@__PURE__*/ require("tslib").__helper`.
        var requireCall = ts.createCall(ts.createIdentifier('require'), undefined, [ts.createLiteral('tslib')]);
        var pureRequireCall = ts.addSyntheticLeadingComment(requireCall, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', false);
        var helperAccess = ts.createPropertyAccess(pureRequireCall, name);
        var variableDeclaration = ts.createVariableDeclaration(name, undefined, helperAccess);
        var variableStatement = ts.createVariableStatement(undefined, [variableDeclaration]);
        return variableStatement;
    }
    else {
        // Use `import { __helper } from "tslib"`.
        var namedImports = ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier(name))]);
        // typescript@next is needed for a fix to the function parameter types of ts.createImportClause.
        // https://github.com/Microsoft/TypeScript/pull/15999
        var importClause = ts.createImportClause(undefined, namedImports);
        var newNode = ts.createImportDeclaration(undefined, undefined, importClause, ts.createLiteral('tslib'));
        return newNode;
    }
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