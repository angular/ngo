"use strict";
var fs = require("fs");
var ts = require("typescript");
var PLATFORM_WHITELIST = [
    'PlatformRef_',
    'TestabilityRegistry',
    'Console',
    'BrowserPlatformLocation',
];
var ANGULAR_SPECIFIERS = [
    // Class level decorators.
    'Component',
    'Directive',
    'Injectable',
    'NgModule',
    'Pipe',
    // Property level decorators.
    'ContentChild',
    'ContentChildren',
    'HostBinding',
    'HostListener',
    'Input',
    'Output',
    'ViewChild',
    'ViewChildren',
];
function scrubFile(file, name) {
    var contents = fs.readFileSync(file).toString();
    var options = {
        allowJs: true,
    };
    var program = ts.createProgram([file], options);
    var source = program.getSourceFile(file);
    var checker = program.getTypeChecker();
    var ngMetadata = findAngularMetadata(source);
    var decorate = findDecorateFunction(source);
    var nodes = [];
    ts.forEachChild(source, function (node) {
        if (node.kind !== ts.SyntaxKind.ExpressionStatement) {
            return;
        }
        var exprStmt = node;
        if (isDecoratorAssignmentExpression(exprStmt)) {
            nodes.push.apply(nodes, pickDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
        if (isPropDecoratorAssignmentExpression(exprStmt)) {
            nodes.push.apply(nodes, pickPropDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
        if (isCtorParamsAssignmentExpression(exprStmt) && !isCtorParamsWhitelistedService(exprStmt)) {
            nodes.push(node);
        }
    });
    if (!!decorate) {
        var helper_1 = function (node) {
            if (node.kind !== ts.SyntaxKind.ExpressionStatement) {
                ts.forEachChild(node, helper_1);
                return;
            }
            if (isDecorationAssignment(node, decorate, checker)) {
                var decNodes = pickDecorateNodesToRemove(node, decorate, ngMetadata, checker);
                decNodes.forEach(function (decNode) { return decNode._comma = true; });
                nodes.push.apply(nodes, decNodes);
                return;
            }
            ts.forEachChild(node, helper_1);
        };
        ts.forEachChild(source, helper_1);
    }
    console.log('LOG', name, "processed " + nodes.length + " nodes");
    nodes.forEach(function (node) {
        var commaOffset = node._comma ? 1 : 0;
        contents = replaceSubstr(contents, node.getStart(), node.getEnd() + commaOffset);
    });
    return contents;
}
exports.scrubFile = scrubFile;
function isDecorationAssignment(node, decorate, checker) {
    if (node.expression.kind !== ts.SyntaxKind.BinaryExpression) {
        return false;
    }
    var binEx = node.expression;
    if (binEx.right.kind !== ts.SyntaxKind.CallExpression) {
        return false;
    }
    var callEx = binEx.right;
    if (callEx.arguments.length !== 2) {
        return false;
    }
    var arg = callEx.arguments[0];
    if (arg.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return false;
    }
    if (!!callEx.expression && callEx.expression.kind === ts.SyntaxKind.Identifier && nodeIsDecorate(callEx.expression, decorate, checker)) {
        return true;
    }
    return false;
}
function pickDecorateNodesToRemove(node, decorate, ngMetadata, checker) {
    var binEx = expect(node.expression, ts.SyntaxKind.BinaryExpression);
    var callEx = expect(binEx.right, ts.SyntaxKind.CallExpression);
    var metadata = expect(callEx.arguments[0], ts.SyntaxKind.ArrayLiteralExpression);
    return metadata.elements.filter(function (exp) {
        return isAngularDecoratorCall(exp, ngMetadata, checker);
    });
}
function isAngularDecoratorCall(node, ngMetadata, checker) {
    if (node.kind !== ts.SyntaxKind.CallExpression) {
        return false;
    }
    var callEx = node;
    if (callEx.expression.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    var id = callEx.expression;
    return identifierIsMetadata(id, ngMetadata, checker);
}
function collectDeepNodes(node, kind) {
    var nodes = [];
    var helper = function (child) {
        if (child.kind === kind) {
            nodes.push(child);
        }
        ts.forEachChild(child, helper);
    };
    ts.forEachChild(node, helper);
    return nodes;
}
function nameOfSpecifier(node) {
    return node.name && node.name.text || '<unknown>';
}
function expect(node, kind) {
    if (node.kind !== kind) {
        throw 'Invalid!';
    }
    return node;
}
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
function findAngularMetadata(node) {
    var specs = [];
    ts.forEachChild(node, function (child) {
        if (child.kind === ts.SyntaxKind.ImportDeclaration) {
            var importDecl = child;
            if (isAngularCoreImport(importDecl)) {
                specs.push.apply(specs, collectDeepNodes(node, ts.SyntaxKind.ImportSpecifier)
                    .filter(function (spec) { return isAngularCoreSpecifier(spec); }));
            }
        }
    });
    var localDecl = findAllDeclarations(node)
        .filter(function (decl) { return ANGULAR_SPECIFIERS.indexOf(decl.name.text) !== -1; });
    if (localDecl.length === ANGULAR_SPECIFIERS.length) {
        specs = specs.concat(localDecl);
    }
    return specs;
}
function findAllDeclarations(node) {
    var nodes = [];
    ts.forEachChild(node, function (child) {
        if (child.kind === ts.SyntaxKind.VariableStatement) {
            var vStmt = child;
            vStmt.declarationList.declarations.forEach(function (decl) {
                if (decl.name.kind !== ts.SyntaxKind.Identifier) {
                    return;
                }
                nodes.push(decl);
            });
        }
    });
    return nodes;
}
function findDecorateFunction(node) {
    var decl = null;
    ts.forEachChild(node, function (child) {
        if (child.kind !== ts.SyntaxKind.VariableStatement) {
            return;
        }
        collectDeepNodes(child, ts.SyntaxKind.VariableDeclaration).forEach(function (declChild) {
            if (declChild.name.kind !== ts.SyntaxKind.Identifier) {
                return;
            }
            if (declChild.name.text === '___decorate' &&
                collectDeepNodes(declChild, ts.SyntaxKind.PropertyAccessExpression)
                    .some(isReflectDecorateMethod)) {
                decl = declChild;
            }
        });
    });
    return decl;
}
function isReflectDecorateMethod(node) {
    if (node.expression.kind !== ts.SyntaxKind.Identifier || node.name.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    return node.expression.text === 'Reflect' && node.name.text === 'decorate';
}
function isAngularCoreImport(node) {
    return true &&
        node.moduleSpecifier &&
        node.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral &&
        node.moduleSpecifier.text === '@angular/core';
}
function isAngularCoreSpecifier(node) {
    return ANGULAR_SPECIFIERS.indexOf(nameOfSpecifier(node)) !== -1;
}
function isDecoratorAssignmentExpression(exprStmt) {
    if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
        return false;
    }
    var expr = exprStmt.expression;
    if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
        return false;
    }
    var propAccess = expr.left;
    if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    if (propAccess.name.text !== 'decorators') {
        return false;
    }
    if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
        return false;
    }
    if (expr.right.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return false;
    }
    return true;
}
function isPropDecoratorAssignmentExpression(exprStmt) {
    if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
        return false;
    }
    var expr = exprStmt.expression;
    if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
        return false;
    }
    var propAccess = expr.left;
    if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    if (propAccess.name.text !== 'propDecorators') {
        return false;
    }
    if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
        return false;
    }
    if (expr.right.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
        return false;
    }
    return true;
}
function isCtorParamsAssignmentExpression(exprStmt) {
    if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
        return false;
    }
    var expr = exprStmt.expression;
    if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
        return false;
    }
    var propAccess = expr.left;
    if (propAccess.name.text !== 'ctorParameters') {
        return false;
    }
    if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    if (expr.operatorToken.kind !== ts.SyntaxKind.FirstAssignment) {
        return false;
    }
    if (expr.right.kind !== ts.SyntaxKind.FunctionExpression) {
        return false;
    }
    return true;
}
function isCtorParamsWhitelistedService(exprStmt) {
    var expr = exprStmt.expression;
    var propAccess = expr.left;
    var serviceId = propAccess.expression;
    return PLATFORM_WHITELIST.indexOf(serviceId.text) !== -1;
}
function pickDecorationNodesToRemove(exprStmt, ngMetadata, checker) {
    var expr = expect(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
    var literal = expect(expr.right, ts.SyntaxKind.ArrayLiteralExpression);
    if (!literal.elements.every(function (elem) { return elem.kind === ts.SyntaxKind.ObjectLiteralExpression; })) {
        return [];
    }
    var elements = literal.elements;
    var ngDecorators = elements.filter(function (elem) { return isAngularDecorator(elem, ngMetadata, checker); });
    return (elements.length > ngDecorators.length) ? ngDecorators : [exprStmt];
}
function pickPropDecorationNodesToRemove(exprStmt, ngMetadata, checker) {
    var expr = expect(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
    var literal = expect(expr.right, ts.SyntaxKind.ObjectLiteralExpression);
    if (!literal.properties.every(function (elem) { return elem.kind === ts.SyntaxKind.PropertyAssignment &&
        elem.initializer.kind === ts.SyntaxKind.ArrayLiteralExpression; })) {
        return [];
    }
    var assignments = literal.properties;
    // Consider each assignment individually. Either the whole assignment will be removed or
    // a particular decorator within will.
    var toRemove = assignments
        .map(function (assign) {
        var decorators = expect(assign.initializer, ts.SyntaxKind.ArrayLiteralExpression).elements;
        if (!decorators.every(function (el) { return el.kind === ts.SyntaxKind.ObjectLiteralExpression; })) {
            return [];
        }
        var decsToRemove = decorators.filter(function (expr) {
            var lit = expect(expr, ts.SyntaxKind.ObjectLiteralExpression);
            return isAngularDecorator(lit, ngMetadata, checker);
        });
        if (decsToRemove.length === decorators.length) {
            return [assign];
        }
        return decsToRemove;
    })
        .reduce(function (accum, toRemove) { return accum.concat(toRemove); }, []);
    // If every node to be removed is a property assignment (full property's decorators) and
    // all properties are accounted for, remove the whole assignment. Otherwise, remove the
    // nodes which were marked as safe.
    if (toRemove.length === assignments.length &&
        toRemove.every(function (node) { return node.kind === ts.SyntaxKind.PropertyAssignment; })) {
        return [exprStmt];
    }
    return toRemove;
}
function isAngularDecorator(literal, ngMetadata, checker) {
    var types = literal.properties.filter(isTypeProperty);
    if (types.length !== 1) {
        return false;
    }
    var assign = expect(types[0], ts.SyntaxKind.PropertyAssignment);
    if (assign.initializer.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    var id = assign.initializer;
    var res = identifierIsMetadata(id, ngMetadata, checker);
    return res;
}
function isTypeProperty(prop) {
    if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
        return false;
    }
    var assignment = prop;
    if (assignment.name.kind !== ts.SyntaxKind.Identifier) {
        return false;
    }
    var name = assignment.name;
    return name.text === 'type';
}
function identifierIsMetadata(id, metadata, checker) {
    var symbol = checker.getSymbolAtLocation(id);
    if (!symbol || !symbol.declarations || !symbol.declarations.length) {
        return false;
    }
    return symbol
        .declarations
        .some(function (spec) { return metadata.indexOf(spec) !== -1; });
}
function nodeIsDecorate(node, decorate, checker) {
    var symbol = checker.getSymbolAtLocation(node);
    if (!symbol || !symbol.declarations || !symbol.declarations.length) {
        return false;
    }
    return symbol
        .declarations
        .some(function (spec) { return spec == decorate; });
}
function repeatSpace(count) {
    var space = '';
    for (var i = 0; i < count; i++) {
        space += ' ';
    }
    return space;
}
function replaceSubstr(initial, begin, end) {
    var before = initial.substring(0, begin);
    var piece = initial.substring(begin, end);
    var after = initial.substring(end);
    return before + piece.replace(/[^ \t\r\n]/g, ' ') + after;
}
