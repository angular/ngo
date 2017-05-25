"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var ts = require("typescript");
function foldFile(file, name) {
    var contents = fs.readFileSync(file).toString();
    var options = {
        allowJs: true,
    };
    var program = ts.createProgram([file], options);
    var source = program.getSourceFile(file);
    var checker = program.getTypeChecker();
    // Get all class fold operations for this file.
    var ops = foldAllClasses(source, checker);
    console.error(name + ": folding " + ops.length + " ops");
    // Sort operations by position.
    ops.sort(function (a, b) {
        if (a.pos < b.pos) {
            return 1;
        }
        else if (a.pos === b.pos) {
            return 0;
        }
        else {
            return -1;
        }
    });
    ops.forEach(function (op) {
        var prefix = contents.substring(0, op.pos);
        // This works because the amount of text inserted is always equal to the removed.
        // Otherwise, the positions would affect each other.
        switch (op.op) {
            case 'insert':
                var suffix = contents.substring(op.pos);
                contents = prefix + op.text + suffix;
                break;
            case 'remove':
                var remainder = contents.substring(op.pos + op.text.length);
                contents = prefix + remainder;
                break;
        }
    });
    return contents;
}
exports.foldFile = foldFile;
function foldAllClasses(node, checker) {
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
        var retStmt = fn.body.statements[fn.body.statements.length - 1];
        classes.push({
            name: name,
            class: varDecl,
            return: retStmt,
        });
    });
    var ops = [];
    // Now find each assignment outside of the declaration. 
    ts.forEachChild(node, function (child) {
        if (child.kind !== ts.SyntaxKind.ExpressionStatement) {
            return;
        }
        var exprStmt = child;
        if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
            return;
        }
        var binEx = exprStmt.expression;
        if (binEx.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
            return;
        }
        var propAccess = binEx.left;
        if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
            return;
        }
        var decls = checker.getSymbolAtLocation(propAccess.expression).declarations;
        if (decls.length !== 1) {
            return;
        }
        var classIdx = classes.map(function (clazz) { return clazz.class; }).indexOf(decls[0]);
        if (classIdx === -1) {
            return;
        }
        var clazz = classes[classIdx];
        var text = child.getText();
        ops.unshift({
            op: 'insert',
            pos: clazz.return.getStart(),
            text: text,
        });
        ops.unshift({
            op: 'remove',
            pos: child.getStart(),
            text: text,
        });
    });
    return ops;
}
exports.foldAllClasses = foldAllClasses;
