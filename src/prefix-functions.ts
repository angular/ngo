import * as fs from 'fs';
import * as ts from 'typescript';

export function prefixFunctions(file: string, name: string): string {
  let contents = fs.readFileSync(file).toString();

  const options: ts.CompilerOptions = {
    allowJs: true,
  };

  const program = ts.createProgram([file], options);
  const source = program.getSourceFile(file);
  const PURE_STRING = '/*@__PURE__*/';

  const topLevelPositions = findTopLevelFunctions(source);
  console.error(`${name}: prefixing ${topLevelPositions.length} top-level functions and new expressions`);

  // Starting from the latest positions so they aren't shifted down when pure is inserted
  for(let i = topLevelPositions.length - 1; i >= 0; i--) {
    let currPos = topLevelPositions[i];
    contents = contents.substring(0, currPos) + PURE_STRING + contents.substring(currPos);
  }

  // Print out the paths of the import statements with explicit import clauses
  // so purify can prefix them with pure.
  const pureImports = findPureImports(source);
  console.error(`${name}: printing ${pureImports.length} safe imports`);
  contents += `/** PURE_IMPORTS_START ${pureImports.join(',')} PURE_IMPORTS_END */`;
  return contents;
}

export function findTopLevelFunctions(node: ts.Node): number[] {
  const topLevelPositions = [];
  ts.forEachChild(node, cb);

  let previousNode: any;
  function cb(node: any) {
    // Stop recursing into this branch if it's a function expression or declaration
    if (node.kind === ts.SyntaxKind.FunctionDeclaration ||
        node.kind === ts.SyntaxKind.FunctionExpression) {
      return;
    }

    // We need to check specially for IIFEs formatted as call expressions inside parenthesized
    // expressions: `(function() {}())` Their start pos doesn't include the opening paren
    // and must be adjusted.
    if (isIIFE(node) && previousNode.kind === ts.SyntaxKind.ParenthesizedExpression) {
      topLevelPositions.push(node.pos - 1);
    } else if (node.kind === ts.SyntaxKind.CallExpression ||
               node.kind === ts.SyntaxKind.NewExpression) {
      topLevelPositions.push(node.pos);
    }

    previousNode = node;
    return ts.forEachChild(node, cb);

  }

  function isIIFE(node: any): boolean {
    return node.kind === ts.SyntaxKind.CallExpression && !node.expression.text &&
           node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression;
  }

  return topLevelPositions;
}

export function findPureImports(node: ts.Node): string[] {
  const pureImports = [];
  ts.forEachChild(node, cb);

  function cb(node: any) {
    if (node.kind === ts.SyntaxKind.ImportDeclaration && node.importClause) {
      // Save the path of the import transformed into snake case
      pureImports.push(node.moduleSpecifier.text.replace(/[\/@\-]/g, '_'));
    }
    return ts.forEachChild(node, cb);
  }
  return pureImports;
}
