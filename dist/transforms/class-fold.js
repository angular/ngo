"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getFoldFileTransformer(program) {
    var checker = program.getTypeChecker();
    return function (context) {
        var transformer = function (sf) {
            var classes = findClassDeclarations(sf);
            var statements = findClassStaticPropertyAssignments(sf, checker, classes);
            var visitor = function (node) {
                // Check if node is a statement to be dropped.
                if (statements.find(function (st) { return st.expressionStatement === node; })) {
                    return null;
                }
                // Check if node is a class to add statements to.
                var clazz = classes.find(function (cl) { return cl.classFunction === node; });
                if (clazz) {
                    var functionExpression = node;
                    var newExpressions = clazz.statements.map(function (st) {
                        return ts.createStatement(st.expressionStatement.expression);
                    });
                    // Create a new body with all the original statements, plus new ones,
                    // plus return statement.
                    var newBody = ts.createBlock(functionExpression.body.statements.slice(0, -1).concat(newExpressions, functionExpression.body.statements.slice(-1)));
                    var newNode = ts.createFunctionExpression(functionExpression.modifiers, functionExpression.asteriskToken, functionExpression.name, functionExpression.typeParameters, functionExpression.parameters, functionExpression.type, newBody);
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
exports.getFoldFileTransformer = getFoldFileTransformer;
function findClassDeclarations(node) {
    var classes = [];
    // Find all class declarations, build a ClassData for each.
    ts.forEachChild(node, function (child) {
        if (child.kind !== ts.SyntaxKind.VariableStatement) {
            return;
        }
        var varStmt = child;
        if (varStmt.declarationList.declarations.length > 1) {
            return;
        }
        var varDecl = varStmt.declarationList.declarations[0];
        if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
            return;
        }
        var name = varDecl.name.text;
        var expr = varDecl.initializer;
        if (!expr || expr.kind !== ts.SyntaxKind.ParenthesizedExpression) {
            return;
        }
        if (expr.expression.kind !== ts.SyntaxKind.CallExpression) {
            return;
        }
        var callExpr = expr.expression;
        if (callExpr.expression.kind !== ts.SyntaxKind.FunctionExpression) {
            return;
        }
        var fn = callExpr.expression;
        if (fn.body.statements.length < 2) {
            return;
        }
        if (fn.body.statements[0].kind !== ts.SyntaxKind.FunctionDeclaration) {
            return;
        }
        var innerFn = fn.body.statements[0];
        if (fn.body.statements[fn.body.statements.length - 1].kind !== ts.SyntaxKind.ReturnStatement) {
            return;
        }
        if (!innerFn.name || innerFn.name.kind !== ts.SyntaxKind.Identifier) {
            return;
        }
        if (innerFn.name.text !== name) {
            return;
        }
        classes.push({
            name: name,
            class: varDecl,
            classFunction: fn,
            statements: [],
        });
    });
    return classes;
}
function findClassStaticPropertyAssignments(node, checker, classes) {
    var statements = [];
    // Find each assignment outside of the declaration.
    ts.forEachChild(node, function (child) {
        if (child.kind !== ts.SyntaxKind.ExpressionStatement) {
            return;
        }
        var expressionStatement = child;
        if (expressionStatement.expression.kind !== ts.SyntaxKind.BinaryExpression) {
            return;
        }
        var binEx = expressionStatement.expression;
        if (binEx.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
            return;
        }
        var propAccess = binEx.left;
        if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
            return;
        }
        var symbol = checker.getSymbolAtLocation(propAccess.expression);
        if (!symbol) {
            return;
        }
        var decls = symbol.declarations;
        if (decls === undefined || decls.length !== 1) {
            return;
        }
        var classIdx = classes.map(function (clazz) { return clazz.class; }).indexOf(decls[0]);
        if (classIdx === -1) {
            return;
        }
        var hostClass = classes[classIdx];
        var statement = { expressionStatement: expressionStatement, hostClass: hostClass };
        hostClass.statements.push(statement);
        statements.push(statement);
    });
    return statements;
}
//# sourceMappingURL=class-fold.js.map