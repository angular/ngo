import { basename, dirname, relative } from 'path';
import * as ts from 'typescript';


interface TransformJavascriptOptions {
  content: string;
  getTransforms: Array<(program: ts.Program) => ts.TransformerFactory<ts.SourceFile>>;
  emitSourceMap?: boolean;
  inputFilePath?: string;
  outputFilePath?: string;
}

export const transformJavascript = (options: TransformJavascriptOptions) => {
  options.emitSourceMap = !!options.emitSourceMap;
  const { content, getTransforms, emitSourceMap, inputFilePath, outputFilePath } = options;

  // Print error diagnostics.
  const checkDiagnostics = (diagnostics: ts.Diagnostic[]) => {
    if (diagnostics && diagnostics.length > 0) {
      let errors = '';
      errors = errors + '\n' + ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: (f: string) => f,
      });
      throw new Error(errors);
    }
  };

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

  const tsOptions: ts.CompilerOptions = {
    allowJs: true,
    // Using just line feed makes test comparisons easier, and doesn't matter for generated files.
    newLine: ts.NewLineKind.LineFeed,
    // We target next so that there is no downleveling.
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    outDir: '$$_temp/',
    sourceMap: emitSourceMap,
    inlineSources: true,
    inlineSourceMap: false,
  };

  const program = ts.createProgram(Array.from(fileMap.keys()), tsOptions, host);

  // We need the checker inside transforms.
  const transforms = getTransforms.map((getTf) => getTf(program));

  const { emitSkipped, diagnostics } = program.emit(
    undefined, host.writeFile, undefined, undefined,
    { before: transforms, after: [] });

  checkDiagnostics(diagnostics);

  let transformedContent = outputs.get(`${tempOutDir}${tempFilename}`);

  if (emitSkipped || !transformedContent) {
    throw new Error('TS compilation was not successfull.');
  }

  let sourceMap = null;

  if (emitSourceMap) {
    const tsSourceMap = outputs.get(`${tempOutDir}${tempFilename}.map`);
    const urlRegExp = /^\/\/# sourceMappingURL=[^\r\n]*/gm;
    sourceMap = JSON.parse(tsSourceMap as string);
    // Fix sourcemaps file references.
    if (outputFilePath) {
      sourceMap.file = basename(outputFilePath);
      transformedContent = transformedContent.replace(urlRegExp, `//# sourceMappingURL=${sourceMap.file}.map\n`);
      if (inputFilePath) {
        sourceMap.sources = [relative(dirname(outputFilePath), inputFilePath)];
      } else {
        sourceMap.sources = [''];
      }
    } else {
      transformedContent = transformedContent.replace(urlRegExp, '');
      sourceMap.file = '';
      sourceMap.sources = [''];
    }
  }

  return {
    content: transformedContent,
    sourceMap,
  };
};
