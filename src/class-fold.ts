import * as fs from 'fs';
import * as ts from 'typescript';

interface ClassData {
  name: string;
  class: ts.VariableDeclaration;
  return: ts.ReturnStatement;
}

export interface OpDesc {
  op: 'insert' | 'remove';
  pos: number;
  text: string;
}

export function foldFile(file: string, name: string): string {
  let contents = fs.readFileSync(file).toString();

  const options: ts.CompilerOptions = {
    allowJs: true,
  };

  const program = ts.createProgram([file], options);
  const source = program.getSourceFile(file);
  const checker = program.getTypeChecker();

  const ops = foldAllClasses(source, checker);
  console.error(`${name}: folding ${ops.length} ops`);

  ops.sort((a, b) => {
    if (a.pos < b.pos) {
      return 1;
    } else if (a.pos === b.pos) {
      return 0;
    } else {
      return -1;
    }
  });

  ops.forEach(op => {
    const prefix = contents.substring(0, op.pos);
    switch (op.op) {
      case 'insert':
        const suffix = contents.substring(op.pos);
        contents = prefix + op.text + suffix;
        break;
      case 'remove':
        const remainder = contents.substring(op.pos + op.text.length);
        contents = prefix + remainder;
        break;
    }
  });

  return contents;
}

export function foldAllClasses(node: ts.Node, checker: ts.TypeChecker): OpDesc[] {
  const classes: ClassData[] = [];
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
    if ((innerFn.name as ts.Identifier).text !== name) {
      return;
    }
    const retStmt = fn.body.statements[fn.body.statements.length - 1] as ts.ReturnStatement;
    classes.push({
      name,
      class: varDecl,
      return: retStmt,
    });
  });

  const ops = [] as OpDesc[];

  // Now find each assignment outside of the declaration. 
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
    ops.unshift({
      op: 'insert',
      pos: clazz.return.getStart(),
      text,
    });
    ops.unshift({
      op: 'remove',
      pos: child.getStart(),
      text,
    });
  });
  return ops;
}