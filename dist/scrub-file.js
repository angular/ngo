"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
// Don't remove `ctorParameters` from these.
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
function getScrubFileTransformer(program) {
    var checker = program.getTypeChecker();
    var foldFileTransform = function (context) {
        var transformer = function (sf) {
            var ngMetadata = findAngularMetadata(sf);
            var decorate = findDecorateFunction(sf);
            var nodes = [];
            ts.forEachChild(sf, function (node) {
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
                        var decNodes = pickDecorateNodesToRemove(node, ngMetadata, checker);
                        decNodes.forEach(function (decNode) { return decNode._comma = true; });
                        nodes.push.apply(nodes, decNodes);
                        return;
                    }
                    ts.forEachChild(node, helper_1);
                };
                ts.forEachChild(sf, helper_1);
            }
            var visitor = function (node) {
                // Check if node is a statement to be dropped.
                if (nodes.find(function (n) { return n === node; })) {
                    return null;
                }
                // Otherwise return node as is.
                return ts.visitEachChild(node, visitor, context);
            };
            return ts.visitNode(sf, visitor);
        };
        return transformer;
    };
    return foldFileTransform;
}
exports.getScrubFileTransformer = getScrubFileTransformer;
function expect(node, kind) {
    if (node.kind !== kind) {
        throw new Error('Invalid!');
    }
    return node;
}
exports.expect = expect;
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
    if (!!callEx.expression && callEx.expression.kind === ts.SyntaxKind.Identifier
        && nodeIsDecorate(callEx.expression, decorate, checker)) {
        return true;
    }
    return false;
}
function pickDecorateNodesToRemove(node, ngMetadata, checker) {
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
        var decsToRemove = decorators.filter(function (expression) {
            var lit = expect(expression, ts.SyntaxKind.ObjectLiteralExpression);
            return isAngularDecorator(lit, ngMetadata, checker);
        });
        if (decsToRemove.length === decorators.length) {
            return [assign];
        }
        return decsToRemove;
    })
        .reduce(function (accum, toRm) { return accum.concat(toRm); }, []);
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
// Check if an identifier is part of the known Angular Metadata.
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
        .some(function (spec) { return spec === decorate; });
}
//# sourceMappingURL=scrub-file.js.map