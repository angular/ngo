"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
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
