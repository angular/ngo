import * as ts from 'typescript';


export function getImportTslibTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) => {
      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {

        // Check if node is a TS helper declaration.
        if (isTsHelper(node)) {
          // Replace node with import for that helper.
          return ts.visitEachChild(createTslibImport(node), visitor, context);
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sf, visitor);
    };
    return transformer;
  };
}

function createTslibImport(node: ts.Node): ts.Node {
  const name = getVariableStatementName(node);

  if (!name) {
    return node;
  }

  const namedImports = ts.createNamedImports([ts.createImportSpecifier(undefined, ts.createIdentifier(name))]);
  // typescript@next is needed for a fix to the function parameter types of ts.createImportClause.
  // https://github.com/Microsoft/TypeScript/pull/15999
  const importClause = ts.createImportClause(undefined, namedImports);
  const newNode = ts.createImportDeclaration(undefined, undefined, importClause, ts.createLiteral('tslib'));

  return newNode;
}

function isTsHelper(node: ts.Node): boolean {
  if (node.kind !== ts.SyntaxKind.VariableStatement) {
    return false;
  }
  const varStmt = node as ts.VariableStatement;
  if (varStmt.declarationList.declarations.length > 1) {
    return false;
  }
  const varDecl = varStmt.declarationList.declarations[0];
  if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
    return false;
  }

  const name = getVariableStatementName(node);

  if (!name) {
    return false;
  }

  // TODO: there are more helpers than these, should we replace them all?
  const tsHelpers = [
    '__extends',
    '__decorate',
    '__metadata',
    '__param',
  ];

  if (tsHelpers.indexOf(name) === -1) {
    return false;
  }

  // TODO: maybe add a few more checks, like checking the first part of the assignment.

  return true;
}

function getVariableStatementName(node: ts.Node) {
  const varStmt = node as ts.VariableStatement;
  if (varStmt.declarationList.declarations.length > 1) {
    return null;
  }
  const varDecl = varStmt.declarationList.declarations[0];
  if (varDecl.name.kind !== ts.SyntaxKind.Identifier) {
    return null;
  }

  const name = (varDecl.name as ts.Identifier).text;

  // node.getText() on a name that starts with two underscores will return three instead.
  return name.replace(/^___/, '__');
}
