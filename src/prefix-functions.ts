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

  const topLevelPositions = findTopLevelFunctions(source, contents);
  console.error(`${name}: prefixing ${topLevelPositions.length} top-level functions and new expressions`);

  // Starting from the latest positions so they aren't shifted down when pure is inserted
  for(let i = topLevelPositions.length - 1; i >= 0; i--) {
    let currPos = topLevelPositions[i];
    contents = contents.substring(0, currPos) + PURE_STRING + contents.substring(currPos);
  }

  return contents;
}

export function findTopLevelFunctions(node: ts.Node, contents: string): number[] {
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
    if (node.kind === ts.SyntaxKind.CallExpression && !node.expression.text &&
        previousNode.kind === ts.SyntaxKind.ParenthesizedExpression &&
        node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) {
      topLevelPositions.push(node.pos - 1);
    } else if (node.kind === ts.SyntaxKind.CallExpression ||
               node.kind === ts.SyntaxKind.NewExpression) {
      topLevelPositions.push(node.pos);
    }

    previousNode = node;
    return ts.forEachChild(node, cb);

  }
  return topLevelPositions;
}
