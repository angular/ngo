import * as fs from 'fs';
import * as ts from 'typescript';

export function scrubFile(file: string, name: string): string {
  let contents = fs.readFileSync(file).toString();

  const options: ts.CompilerOptions = {
    allowJs: true,
  };

  const program = ts.createProgram([file], options);
  const source = program.getSourceFile(file);

  const checker = program.getTypeChecker();

  const ngMetadata = findAngularMetadataImports(source);
  const decorate = findDecorateFunction(source);

  let nodes: ts.Node[] = [];
  ts.forEachChild(source, node => {
    if (node.kind !== ts.SyntaxKind.ExpressionStatement) {
      return;
    }
    if (isDecoratorAssignmentExpression(node as ts.ExpressionStatement)) {
      nodes.push(...pickDecorationNodesToRemove(node as ts.ExpressionStatement, ngMetadata, checker));
    }
  });

  if (!!decorate) {
    const helper = node => {
      if (node.kind !== ts.SyntaxKind.ExpressionStatement) {
        ts.forEachChild(node, helper);
        return;
      }
      if (isDecorationAssignment(node as ts.ExpressionStatement, decorate, checker)) {
        const decNodes = pickDecorateNodesToRemove(node as ts.ExpressionStatement, decorate, ngMetadata, checker);
        decNodes.forEach((decNode: any) => decNode._comma = true);
        nodes.push(...decNodes);
        return;
      }
      ts.forEachChild(node, helper);
    };
    ts.forEachChild(source, helper);
  }

  console.log('LOG', name, `processed ${nodes.length} nodes`);

  nodes.forEach(node => {
    const commaOffset = (node as any)._comma ? 1 : 0;
    contents = replaceSubstr(contents, node.getStart(), node.getEnd() + commaOffset);
  });

  return contents;
}

function isDecorationAssignment(node: ts.ExpressionStatement, decorate: ts.VariableDeclaration, checker: ts.TypeChecker): boolean {
  if (node.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const binEx = node.expression as ts.BinaryExpression;

  if (binEx.right.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callEx = binEx.right as ts.CallExpression;

  if (callEx.arguments.length !== 2) {
    return false;
  }
  const arg = callEx.arguments[0];
  if (arg.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return false;
  }

  if (!!callEx.expression && callEx.expression.kind === ts.SyntaxKind.Identifier && nodeIsDecorate(callEx.expression, decorate, checker)) {
    return true;
  }

  return false;
}

function pickDecorateNodesToRemove(node: ts.ExpressionStatement, decorate: ts.VariableDeclaration, ngMetadata: ts.ImportSpecifier[], checker: ts.TypeChecker): ts.Node[] {
  const binEx = expect<ts.BinaryExpression>(node.expression, ts.SyntaxKind.BinaryExpression);
  const callEx = expect<ts.CallExpression>(binEx.right, ts.SyntaxKind.CallExpression);
  const metadata = expect<ts.ArrayLiteralExpression>(callEx.arguments[0], ts.SyntaxKind.ArrayLiteralExpression);
  return metadata.elements.filter(exp => {
    return isAngularDecoratorCall(exp, ngMetadata, checker);
  });
}

function isAngularDecoratorCall(node: ts.Expression, ngMetadata: ts.ImportSpecifier[], checker: ts.TypeChecker): boolean {
  if (node.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const callEx = node as ts.CallExpression;
  if (callEx.expression.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const id = callEx.expression as ts.Identifier;
  return identifierIsMetadata(id, ngMetadata, checker);
}

function collectDeepNodes<T>(node: ts.Node, kind: ts.SyntaxKind): T[] {
  let nodes: T[] = [];
  let helper = (child: ts.Node) => {
    if (child.kind === kind) {
      nodes.push(child as any as T);
    }
    ts.forEachChild(child, helper);
  };
  ts.forEachChild(node, helper);
  return nodes;
}

function nameOfSpecifier(node: ts.ImportSpecifier): string {
  return node.name && node.name.text || '<unknown>';
}

function expect<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T {
  if (node.kind !== kind) {
    throw 'Invalid!';
  }
  return node as T;
}

function findAngularMetadataImports(node: ts.Node): ts.ImportSpecifier[] {
  let specs: ts.ImportSpecifier[] = [];
  ts.forEachChild(node, (child) => {
    if (child.kind === ts.SyntaxKind.ImportDeclaration) {
      const importDecl = child as ts.ImportDeclaration;
      if (isAngularCoreImport(importDecl)) {
        specs.push(...collectDeepNodes<ts.ImportSpecifier>(node, ts.SyntaxKind.ImportSpecifier)
          .filter(spec => isAngularCoreSpecifier(spec)));
      }
    }
  });
  return specs;
}

function findDecorateFunction(node: ts.Node): ts.VariableDeclaration {
  let decl: ts.VariableDeclaration = null;
  ts.forEachChild(node, child => {
    if (child.kind !== ts.SyntaxKind.VariableStatement) {
      return;
    }
    collectDeepNodes<ts.VariableDeclaration>(child, ts.SyntaxKind.VariableDeclaration).forEach(declChild => {
      if (declChild.name.kind !== ts.SyntaxKind.Identifier) {
        return;
      }
      if ((declChild.name as ts.Identifier).text === '___decorate' &&
          collectDeepNodes<ts.PropertyAccessExpression>(declChild, ts.SyntaxKind.PropertyAccessExpression)
            .some(isReflectDecorateMethod)) {
        decl = declChild;
      }
    });
  });
  return decl;
}

function isReflectDecorateMethod(node: ts.PropertyAccessExpression): boolean {
  if (node.expression.kind !== ts.SyntaxKind.Identifier || node.name.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  return (node.expression as ts.Identifier).text === 'Reflect' && (node.name as ts.Identifier).text === 'decorate';
}

function isAngularCoreImport(node: ts.ImportDeclaration): boolean {
  return true &&
    node.moduleSpecifier &&
    node.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral &&
    (node.moduleSpecifier as ts.StringLiteral).text === '@angular/core';
}

const ANGULAR_SPECIFIERS = [
  'Component',
  'Directive',
  'Injectable',
  'NgModule',
  'Pipe',
];

function isAngularCoreSpecifier(node: ts.ImportSpecifier): boolean {
  return ANGULAR_SPECIFIERS.indexOf(nameOfSpecifier(node)) !== -1;
}

function isDecoratorAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const propAccess = expr.left as ts.PropertyAccessExpression;
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

function pickDecorationNodesToRemove(exprStmt: ts.ExpressionStatement, ngMetadata: ts.ImportSpecifier[], checker: ts.TypeChecker): ts.Node[] {
  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  const literal = expect<ts.ArrayLiteralExpression>(expr.right, ts.SyntaxKind.ArrayLiteralExpression);
  if (!literal.elements.every(elem => elem.kind === ts.SyntaxKind.ObjectLiteralExpression)) {
    return [];
  }
  const elements = literal.elements as ts.Node[] as ts.ObjectLiteralExpression[];
  const ngDecorators = elements.filter(elem => isAngularDecorator(elem, ngMetadata, checker));
  return (elements.length > ngDecorators.length) ? ngDecorators : [exprStmt];
}

function isAngularDecorator(literal: ts.ObjectLiteralExpression, ngMetadata: ts.ImportSpecifier[], checker: ts.TypeChecker): boolean {
  const types = literal.properties.filter(isTypeProperty);
  if (types.length !== 1) {
    return false;
  }
  const assign = expect<ts.PropertyAssignment>(types[0], ts.SyntaxKind.PropertyAssignment);
  if (assign.initializer.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const id = assign.initializer as ts.Identifier;
  return identifierIsMetadata(id, ngMetadata, checker);
}

function isTypeProperty(prop: ts.ObjectLiteralElement): boolean {
  if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
    return false;
  }
  const assignment = prop as ts.PropertyAssignment;
  if (assignment.name.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const name = assignment.name as ts.Identifier;
  return name.text === 'type';
}

function identifierIsMetadata(id: ts.Identifier, metadata: ts.ImportSpecifier[], checker: ts.TypeChecker): boolean {
  const symbol = checker.getSymbolAtLocation(id);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return false;
  }
  return symbol
    .declarations
    .filter(spec => spec.kind === ts.SyntaxKind.ImportSpecifier)
    .some(spec => metadata.indexOf(spec as ts.ImportSpecifier) !== -1);
}

function nodeIsDecorate(node: ts.Node, decorate: ts.VariableDeclaration, checker: ts.TypeChecker): boolean {
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return false;
  }
  return symbol
    .declarations
    .some(spec => spec == decorate);
}


function repeatSpace(count: number) {
  let space = '';
  for (let i = 0; i < count; i++) {
    space += ' ';
  }
  return space;
}

function replaceSubstr(initial: string, begin: number, end: number): string {
  const before = initial.substring(0, begin);
  const piece = initial.substring(begin, end);
  const after = initial.substring(end);
  return before + piece.replace(/[^ \t\r\n]/g, ' ') + after;
}
