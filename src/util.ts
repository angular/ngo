import * as ts from 'typescript';


export const transformJavascript = (content, getTransforms) => {
  // Print error diagnostics.
  const checkDiagnostics = (diagnostics: ts.Diagnostic[]) => {
    if (diagnostics && diagnostics.length > 0) {
      console.error(ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: (f: string) => f
      }));
    }
  }

  // Make a in-memory host and populate it with a single file
  const fileMap = new Map<string, string>();
  const sourcesMap = new Map<string, ts.SourceFile>();
  const outputs = new Map<string, string>();

  // We're not actually writing anything to disk, but still need to define an outDir
  // because otherwise TS will fail to emit JS since it would overwrite the original.
  const tempOutDir = '$$_temp/';
  const tempFilename = 'test.js';

  fileMap.set(tempFilename, content);
  fileMap.forEach((v, k) => sourcesMap.set(
    k, ts.createSourceFile(k, v, ts.ScriptTarget.ES2015)));

  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => sourcesMap.get(fileName)!,
    getDefaultLibFileName: () => 'lib.d.ts',
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (fileName) => fileMap.has(fileName),
    readFile: (fileName) => fileMap.has(fileName) ? fileMap.get(fileName)! : '',
    writeFile: (fileName, text) => outputs.set(fileName, text),
  };

  const options: ts.CompilerOptions = {
    allowJs: true,
    // Using just line feed makes test comparisons easier, and doesn't matter for generated files.
    newLine: ts.NewLineKind.LineFeed,
    // We target next so that there is no downleveling.
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    outDir: '$$_temp/'
  };

  const compilerHost = ts.createCompilerHost(options);
  const program = ts.createProgram(Array.from(fileMap.keys()), options, host);

  // We need the checker inside transforms.
  const transforms = getTransforms.map((getTf) => getTf(program));

  const { emitSkipped, diagnostics } = program.emit(
    undefined, host.writeFile, undefined, undefined,
    { before: transforms, after: [] });

  checkDiagnostics(diagnostics);

  const transformedContent = outputs.get(tempOutDir + tempFilename);

  if (emitSkipped || !transformedContent) {
    throw new Error('TS compilation was not successfull.');
  }

  return transformedContent;
}

export function expect<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T {
  if (node.kind !== kind) {
    throw 'Invalid!';
  }
  return node as T;
}

export function lookup(node: ts.ObjectLiteralExpression, key: string): ts.Node {
  return node
    .properties
    .reduce((result, prop) => {
      if (result !== null) {
        return result;
      }
      if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
        return null;
      }
      const assign = prop as ts.PropertyAssignment;
      if (assign.name.kind !== ts.SyntaxKind.StringLiteral) {
        return null;
      }
      const lit = assign.name as ts.StringLiteral;
      if (lit.text !== key) {
        return null;
      }
      return assign.initializer;
    }, null as ts.Node);
}