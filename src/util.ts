import * as ts from 'typescript';

export function expect<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T {
  if (node.kind !== kind) {
    throw 'Invalid!';
  }
  return node as T;
}

export function lookup(node: ts.ObjectLiteralExpression, key: string): ts.Node {
  return node
    .properties
    .reduce((result, prop) => {
      if (result !== null) {
        return result;
      }
      if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
        return null;
      }
      const assign = prop as ts.PropertyAssignment;
      if (assign.name.kind !== ts.SyntaxKind.StringLiteral) {
        return null;
      }
      const lit = assign.name as ts.StringLiteral;
      if (lit.text !== key) {
        return null;
      }
      return assign.initializer;
    }, null as ts.Node);
}