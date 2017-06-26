import * as ts from 'typescript';


// Don't remove `ctorParameters` from these.
const PLATFORM_WHITELIST = [
  'PlatformRef_',
  'TestabilityRegistry',
  'Console',
  'BrowserPlatformLocation',
];

const ANGULAR_SPECIFIERS = [
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

export function getScrubFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();

  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const ngMetadata = findAngularMetadata(sf);

      const nodes: ts.Node[] = [];
      ts.forEachChild(sf, (node) => {
        if (node.kind !== ts.SyntaxKind.ExpressionStatement) {
          return;
        }
        const exprStmt = node as ts.ExpressionStatement;
        if (isDecoratorAssignmentExpression(exprStmt)) {
          nodes.push(...pickDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
        if (isPropDecoratorAssignmentExpression(exprStmt)) {
          nodes.push(...pickPropDecorationNodesToRemove(exprStmt, ngMetadata, checker));
        }
        if (isCtorParamsAssignmentExpression(exprStmt) && !isCtorParamsWhitelistedService(exprStmt)) {
          nodes.push(node);
        }
      });

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        // Check if node is a statement to be dropped.
        if (nodes.find((n) => n === node)) {
          return null as any;
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };
    return transformer;
  };
}

export function expect<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T {
  if (node.kind !== kind) {
    throw new Error('Invalid!');
  }
  return node as T;
}

function collectDeepNodes<T>(node: ts.Node, kind: ts.SyntaxKind): T[] {
  const nodes: T[] = [];
  const helper = (child: ts.Node) => {
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

function findAngularMetadata(node: ts.Node): ts.Node[] {
  let specs: ts.Node[] = [];
  ts.forEachChild(node, (child) => {
    if (child.kind === ts.SyntaxKind.ImportDeclaration) {
      const importDecl = child as ts.ImportDeclaration;
      if (isAngularCoreImport(importDecl)) {
        specs.push(...collectDeepNodes<ts.ImportSpecifier>(node, ts.SyntaxKind.ImportSpecifier)
          .filter((spec) => isAngularCoreSpecifier(spec)));
      }
    }
  });

  const localDecl = findAllDeclarations(node)
    .filter((decl) => ANGULAR_SPECIFIERS.indexOf((decl.name as ts.Identifier).text) !== -1);
  if (localDecl.length === ANGULAR_SPECIFIERS.length) {
    specs = specs.concat(localDecl);
  }

  return specs;
}

function findAllDeclarations(node: ts.Node): ts.VariableDeclaration[] {
  const nodes: ts.VariableDeclaration[] = [];
  ts.forEachChild(node, (child) => {
    if (child.kind === ts.SyntaxKind.VariableStatement) {
      const vStmt = child as ts.VariableStatement;
      vStmt.declarationList.declarations.forEach((decl) => {
        if (decl.name.kind !== ts.SyntaxKind.Identifier) {
          return;
        }
        nodes.push(decl);
      });
    }
  });
  return nodes;
}

function isAngularCoreImport(node: ts.ImportDeclaration): boolean {
  return true &&
    node.moduleSpecifier &&
    node.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral &&
    (node.moduleSpecifier as ts.StringLiteral).text === '@angular/core';
}

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

function isPropDecoratorAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
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

function isCtorParamsAssignmentExpression(exprStmt: ts.ExpressionStatement): boolean {
  if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
    return false;
  }
  const expr = exprStmt.expression as ts.BinaryExpression;
  if (expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
    return false;
  }
  const propAccess = expr.left as ts.PropertyAccessExpression;
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

function isCtorParamsWhitelistedService(exprStmt: ts.ExpressionStatement): boolean {
  const expr = exprStmt.expression as ts.BinaryExpression;
  const propAccess = expr.left as ts.PropertyAccessExpression;
  const serviceId = propAccess.expression as ts.Identifier;
  return PLATFORM_WHITELIST.indexOf(serviceId.text) !== -1;
}

function pickDecorationNodesToRemove(exprStmt: ts.ExpressionStatement, ngMetadata: ts.Node[],
  checker: ts.TypeChecker): ts.Node[] {

  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  const literal = expect<ts.ArrayLiteralExpression>(expr.right, ts.SyntaxKind.ArrayLiteralExpression);
  if (!literal.elements.every((elem) => elem.kind === ts.SyntaxKind.ObjectLiteralExpression)) {
    return [];
  }
  const elements = literal.elements as ts.Node[] as ts.ObjectLiteralExpression[];
  const ngDecorators = elements.filter((elem) => isAngularDecorator(elem, ngMetadata, checker));
  return (elements.length > ngDecorators.length) ? ngDecorators : [exprStmt];
}

function pickPropDecorationNodesToRemove(exprStmt: ts.ExpressionStatement, ngMetadata: ts.Node[],
  checker: ts.TypeChecker): ts.Node[] {

  const expr = expect<ts.BinaryExpression>(exprStmt.expression, ts.SyntaxKind.BinaryExpression);
  const literal = expect<ts.ObjectLiteralExpression>(expr.right, ts.SyntaxKind.ObjectLiteralExpression);
  if (!literal.properties.every((elem) => elem.kind === ts.SyntaxKind.PropertyAssignment &&
    (elem as ts.PropertyAssignment).initializer.kind === ts.SyntaxKind.ArrayLiteralExpression)) {
    return [];
  }
  const assignments = literal.properties as ts.Node[] as ts.PropertyAssignment[];
  // Consider each assignment individually. Either the whole assignment will be removed or
  // a particular decorator within will.
  const toRemove = assignments
    .map((assign) => {
      const decorators =
        expect<ts.ArrayLiteralExpression>(assign.initializer, ts.SyntaxKind.ArrayLiteralExpression).elements;
      if (!decorators.every((el) => el.kind === ts.SyntaxKind.ObjectLiteralExpression)) {
        return [];
      }
      const decsToRemove = decorators.filter((expression) => {
        const lit = expect<ts.ObjectLiteralExpression>(expression, ts.SyntaxKind.ObjectLiteralExpression);
        return isAngularDecorator(lit, ngMetadata, checker);
      });
      if (decsToRemove.length === decorators.length) {
        return [assign];
      }
      return decsToRemove;
    })
    .reduce((accum, toRm) => accum.concat(toRm), [] as ts.Node[]);
  // If every node to be removed is a property assignment (full property's decorators) and
  // all properties are accounted for, remove the whole assignment. Otherwise, remove the
  // nodes which were marked as safe.
  if (toRemove.length === assignments.length &&
    toRemove.every((node) => node.kind === ts.SyntaxKind.PropertyAssignment)) {
    return [exprStmt];
  }
  return toRemove;
}

function isAngularDecorator(literal: ts.ObjectLiteralExpression, ngMetadata: ts.Node[],
  checker: ts.TypeChecker): boolean {

  const types = literal.properties.filter(isTypeProperty);
  if (types.length !== 1) {
    return false;
  }
  const assign = expect<ts.PropertyAssignment>(types[0], ts.SyntaxKind.PropertyAssignment);
  if (assign.initializer.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }
  const id = assign.initializer as ts.Identifier;
  const res = identifierIsMetadata(id, ngMetadata, checker);
  return res;
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

// Check if an identifier is part of the known Angular Metadata.
function identifierIsMetadata(id: ts.Identifier, metadata: ts.Node[], checker: ts.TypeChecker): boolean {
  const symbol = checker.getSymbolAtLocation(id);
  if (!symbol || !symbol.declarations || !symbol.declarations.length) {
    return false;
  }
  return symbol
    .declarations
    .some((spec) => metadata.indexOf(spec) !== -1);
}
