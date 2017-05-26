import * as ts from 'typescript';


export const transformJavascript = (content, getTransform) => {
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
    newLine: ts.NewLineKind.LineFeed,
    skipLibCheck: true,
    outDir: '$$_temp/'
  };

  const compilerHost = ts.createCompilerHost(options);
  const program = ts.createProgram(Array.from(fileMap.keys()), options, host);

  // We need the checker inside the transform.
  const transform = getTransform(program);

  const { emitSkipped, diagnostics } = program.emit(
    undefined, host.writeFile, undefined, undefined,
    { before: [transform], after: [] });

  checkDiagnostics(diagnostics);

  const transformedContent = outputs.get(tempOutDir + tempFilename);

  if (emitSkipped || !transformedContent) {
    throw new Error('TS compilation was not successfull.');
  }

  return transformedContent;
}