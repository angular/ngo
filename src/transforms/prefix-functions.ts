import * as ts from 'typescript';


export function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {

      const pureFunctionComment = '@__PURE__';
      const topLevelFunctions = findTopLevelFunctions(sf);
      const pureImports = findPureImports(sf);
      const pureImportsComment = `* PURE_IMPORTS_START ${pureImports.join(',')} PURE_IMPORTS_END `;

      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Add the pure imports comment to the first node.
        if (node.parent && node.parent.parent === undefined && node.pos === 0) {
          const newNode = ts.addSyntheticLeadingComment(
            node, ts.SyntaxKind.MultiLineCommentTrivia, pureImportsComment, true);

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        // Add pure function comment to top level functions.
        if (topLevelFunctions.indexOf(node) !== -1) {
          const newNode = ts.addSyntheticLeadingComment(
            node, ts.SyntaxKind.MultiLineCommentTrivia, pureFunctionComment, false);

          // Replace node with modified one.
          return ts.visitEachChild(newNode, visitor, context);
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };
    return transformer;
  };
}

export function findTopLevelFunctions(parentNode: ts.Node): ts.Node[] {
  const topLevelFunctions: ts.Node[] = [];
  ts.forEachChild(parentNode, cb);

  let previousNode: ts.Node;
  function cb(node: ts.Node): any {
    // Stop recursing into this branch if it's a function expression or declaration
    if (node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.FunctionExpression) {
      return;
    }

    // We need to check specially for IIFEs formatted as call expressions inside parenthesized
    // expressions: `(function() {}())` Their start pos doesn't include the opening paren
    // and must be adjusted.
    if (isIIFE(node) && previousNode.kind === ts.SyntaxKind.ParenthesizedExpression && node.parent) {
      topLevelFunctions.push(node.parent);
    } else if (node.kind === ts.SyntaxKind.CallExpression || node.kind === ts.SyntaxKind.NewExpression) {
      topLevelFunctions.push(node);
    }

    previousNode = node;
    return ts.forEachChild(node, cb);

  }

  function isIIFE(node: any): boolean {
    return node.kind === ts.SyntaxKind.CallExpression && !node.expression.text &&
      node.expression.kind !== ts.SyntaxKind.PropertyAccessExpression;
  }

  return topLevelFunctions;
}

export function findPureImports(parentNode: ts.Node): string[] {
  const pureImports: string[] = [];
  ts.forEachChild(parentNode, cb);

  function cb(node: any): any {
    if (node.kind === ts.SyntaxKind.ImportDeclaration && node.importClause) {
      // Save the path of the import transformed into snake case
      pureImports.push(node.moduleSpecifier.text.replace(/[\/@\-]/g, '_'));
    }
    return ts.forEachChild(node, cb);
  }
  return pureImports;
}
