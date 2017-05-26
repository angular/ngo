import * as fs from 'fs';
import * as ts from 'typescript';

interface ClassData {
  name: string;
  class: ts.VariableDeclaration;
  classFunction: ts.FunctionExpression;
  return: ts.ReturnStatement;
}

interface Ops {
  insert: OpDesc[];
  remove: OpDesc[];
}

interface OpDesc {
  op: 'insert' | 'remove';
  child: ts.Node;
  exprStmt?: ts.ExpressionStatement;
  hostClass?: ClassData;
  pos: number;
  text: string;
}

export function getFoldFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();

  const foldFileTransform = (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const classes = findClassDeclarations(sf);
      const operations = findClassStaticPropertyAssignments(sf, checker, classes);

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        // Check if node should be dropped.
        const removeOps = operations.remove.filter((op) => node == op.child);
        if (removeOps.length != 0) {
          // Drop this node.
          return null as any;
        }

        // Check if node should be added to.
        const insertOps = operations.insert.filter((op) => node == op.hostClass.classFunction);
        if (insertOps.length > 0) {
          const functionExpression = node as ts.FunctionExpression;

          const newExpressions = insertOps.map((op) => ts.createStatement(op.exprStmt.expression));

          // Create a new body with all the original statements, plus new ones, 
          // plus return statement.
          const newBody = ts.createBlock([
            ...functionExpression.body.statements.slice(0, -1),
            ...newExpressions,
            ...functionExpression.body.statements.slice(-1),
          ])

          const newNode = ts.createFunctionExpression(
            functionExpression.modifiers,
            functionExpression.asteriskToken,
            functionExpression.name,
            functionExpression.typeParameters,
            functionExpression.parameters,
            functionExpression.type,
            newBody
          )

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    }
    return transformer;
  }
  return foldFileTransform;
}

function findClassDeclarations(node: ts.Node): ClassData[] {
  const classes: ClassData[] = [];
  // Find all class declarations, build a ClassData for each.
  ts.forEachChild(node, child => {
    if (child.kind !== ts.SyntaxKind.VariableStatement) {
      return;
    }
    const varStmt = child as ts.VariableStatement;
    if (varStmt.declarationList.declarations.length > 1) {
      return;
    }
    const varDecl = varStmt.declarationList.declarations[0];
    if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
      return;
    }
    const name = (varDecl.name as ts.Identifier).text;
    const expr = varDecl.initializer;
    if (!expr || expr.kind !== ts.SyntaxKind.ParenthesizedExpression) {
      return;
    }
    if ((expr as ts.ParenthesizedExpression).expression.kind !== ts.SyntaxKind.CallExpression) {
      return;
    }
    const callExpr = (expr as ts.ParenthesizedExpression).expression as ts.CallExpression;
    if (callExpr.expression.kind !== ts.SyntaxKind.FunctionExpression) {
      return;
    }
    const fn = callExpr.expression as ts.FunctionExpression;
    if (fn.body.statements.length < 2) {
      return;
    }
    if (fn.body.statements[0].kind !== ts.SyntaxKind.FunctionDeclaration) {
      return;
    }
    const innerFn = fn.body.statements[0] as ts.FunctionDeclaration;
    if (fn.body.statements[fn.body.statements.length - 1].kind !== ts.SyntaxKind.ReturnStatement) {
      return;
    }
    if (!innerFn.name || innerFn.name.kind !== ts.SyntaxKind.Identifier) {
      return;
    }
    if ((innerFn.name as ts.Identifier).text !== name) {
      return;
    }
    const retStmt = fn.body.statements[fn.body.statements.length - 1] as ts.ReturnStatement;
    classes.push({
      name,
      class: varDecl,
      classFunction: fn,
      return: retStmt,
    });
  });

  return classes;
}

function findClassStaticPropertyAssignments(node: ts.Node, checker: ts.TypeChecker,
  classes: ClassData[]): Ops {

  const ops = {
    insert: [],
    remove: [],
  }

  // Find each assignment outside of the declaration. 
  ts.forEachChild(node, child => {
    if (child.kind !== ts.SyntaxKind.ExpressionStatement) {
      return;
    }
    const exprStmt = child as ts.ExpressionStatement;
    if (exprStmt.expression.kind !== ts.SyntaxKind.BinaryExpression) {
      return;
    }
    const binEx = exprStmt.expression as ts.BinaryExpression;
    if (binEx.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
      return;
    }
    const propAccess = binEx.left as ts.PropertyAccessExpression;
    if (propAccess.expression.kind !== ts.SyntaxKind.Identifier) {
      return;
    }

    const decls = checker.getSymbolAtLocation(propAccess.expression).declarations;
    if (decls.length !== 1) {
      return;
    }
    const classIdx = classes.map(clazz => clazz.class).indexOf(decls[0] as ts.VariableDeclaration);
    if (classIdx === -1) {
      return;
    }
    const clazz = classes[classIdx];
    const text = child.getText();
    ops.insert.push({
      op: 'insert',
      child,
      exprStmt,
      hostClass: clazz,
      pos: clazz.return.getStart(),
      text,
    });
    ops.remove.push({
      op: 'remove',
      child,
      pos: child.getStart(),
      text,
    });
  });
  return ops;
}