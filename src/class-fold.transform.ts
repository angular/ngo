import * as fs from 'fs';
import * as ts from 'typescript';

interface ClassData {
  name: string;
  class: ts.VariableDeclaration;
  return: ts.ReturnStatement;
}

interface Ops {
  insert: OpDesc[];
  remove: OpDesc[];
}

interface OpDesc {
  op: 'insert' | 'remove';
  child: ts.Node;
  insertBefore?: ts.Node;
  pos: number;
  text: string;
}

export function getFoldFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();

  function foldFileTransform(context: ts.TransformationContext):
    ts.Transformer<ts.SourceFile> {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const classes = findClassDeclarations(sf);
      const operations = findClassStaticPropertyAssignments(sf, checker, classes);

      // console.log(classes)
      // console.log('###ops')
      // operations.insert.map(op => console.log(op.parent));
      // console.log('###end ops')

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        // console.log(node)
        // Check if node should be dropped.
        const removeOps = operations.remove.filter((op) => node == op.child);
        if (removeOps.length != 0) {
          // Drop this node.
          return null as any;
        }

        // Check if node should be added to.
        const insertOps = operations.insert.filter((op) => node == op.insertBefore);
        insertOps.forEach((op) => {
          // console.log(node.parent.getText())
          // console.log(node.getText())
          // // const tmp = node.parent;
          // // node.parent = op.child;
          // // op.child.parent = tmp;
          // console.log(node.parent.getChildren().map(n => n.getText()))
          // ts.add
        })

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
    ops.insert.unshift({
      op: 'insert',
      child,
      insertBefore: clazz.return,
      pos: clazz.return.getStart(),
      text,
    });
    ops.remove.unshift({
      op: 'remove',
      child,
      pos: child.getStart(),
      text,
    });
  });
  return ops;
}