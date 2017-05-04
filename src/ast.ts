import * as fs from 'fs';
import * as ts from 'typescript';

const script = process.argv[2];
const contents = fs.readFileSync(script).toString();

const options: ts.CompilerOptions = {
  allowJs: true,
};
const program = ts.createProgram([script], options);
const source = program.getSourceFile(script);

function printHelper(node: ts.Node, level: string) {
  if (node.kind === ts.SyntaxKind.Identifier) {
    console.log(level + 'Identifier:', (node as ts.Identifier).text);
  } else if (node.kind === ts.SyntaxKind.StringLiteral) {
    console.log(level + 'StringLiteral:', (node as ts.StringLiteral).text);
  } else {
    console.log(level + ts.SyntaxKind[node.kind])
  }
  ts.forEachChild(node, (node) => printHelper(node, level + ' '));
}

ts.forEachChild(source, (node) => printHelper(node, ''));
