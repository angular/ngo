import { readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { RawSourceMap } from 'source-map';
import * as ts from 'typescript';
const MagicString = require('magic-string');

import { NgoOptions } from './ngo';


export interface TransformJavascriptOptions extends NgoOptions {
  content: string;
  getTransforms: Array<(program: ts.Program) => ts.TransformerFactory<ts.SourceFile>>;
}

export const transformJavascript = (options: TransformJavascriptOptions) => {
  options.emitSourceMap = !!options.emitSourceMap;
  options.strict = !!options.strict;
  const { content, getTransforms, emitSourceMap, inputFilePath, outputFilePath, strict } = options;

  // Print error diagnostics.
  const checkDiagnostics = (diagnostics: ts.Diagnostic[]) => {
    if (diagnostics && diagnostics.length > 0) {
      let errors = '';
      errors = errors + '\n' + ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getNewLine: () => ts.sys.newLine,
        getCanonicalFileName: (f: string) => f,
      });
      return errors;
    }
  };

  // Make a in-memory host and populate it with a single file
  const fileMap = new Map<string, string>();
  const sourcesMap = new Map<string, ts.SourceFile>();
  const outputs = new Map<string, string>();

  // We're not actually writing anything to disk, but still need to define an outDir
  // because otherwise TS will fail to emit JS since it would overwrite the original.
  const tempOutDir = '$$_temp/';
  const tempFilename = 'ngo-default-file.js';
  fileMap.set(tempFilename, content);

  // We need to load the default lib for noEmitOnError to work properly.
  const defaultLibFileName = 'lib.d.ts';
  const defaultLibContent = readFileSync(join(dirname(require.resolve('typescript')), defaultLibFileName), 'UTF-8');
  fileMap.set(defaultLibFileName, defaultLibContent);

  fileMap.forEach((v, k) => sourcesMap.set(
    k, ts.createSourceFile(k, v, ts.ScriptTarget.ES2015)));

  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => sourcesMap.get(fileName)!,
    getDefaultLibFileName: () => defaultLibFileName,
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
    noEmitOnError: true,
    allowJs: true,
    // Using just line feed makes test comparisons easier, and doesn't matter for generated files.
    newLine: ts.NewLineKind.LineFeed,
    // We target next so that there is no downleveling.
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    outDir: '$$_temp/',
    sourceMap: emitSourceMap,
    inlineSources: emitSourceMap,
    inlineSourceMap: false,
  };

  const program = ts.createProgram(Array.from(fileMap.keys()), tsOptions, host);

  // We need the checker inside transforms.
  const transforms = getTransforms.map((getTf) => getTf(program));

  const { emitSkipped, diagnostics } = program.emit(
    undefined, host.writeFile, undefined, undefined,
    { before: transforms, after: [] });

  let transformedContent = outputs.get(`${tempOutDir}${tempFilename}`);

  if (emitSkipped || !transformedContent) {
    // Throw only if we're in strict mode, otherwise return original content.
    if (strict) {
      throw new Error(`
        TS failed with the following error messages:

        ${checkDiagnostics(diagnostics)}
      `);
    } else {
      return {
        content,
        sourceMap: !emitSourceMap ? null : new MagicString(content).generateMap({
          source: inputFilePath,
          file: outputFilePath ? `${outputFilePath}.map` : null,
          includeContent: true,
        }),
      };
    }
  }

  let sourceMap: RawSourceMap | null = null;

  if (emitSourceMap) {
    const tsSourceMap = outputs.get(`${tempOutDir}${tempFilename}.map`);
    const urlRegExp = /^\/\/# sourceMappingURL=[^\r\n]*/gm;
    sourceMap = JSON.parse(tsSourceMap as string) as RawSourceMap;
    // Fix sourcemaps file references.
    if (outputFilePath) {
      sourceMap.file = basename(outputFilePath);
      transformedContent = transformedContent.replace(urlRegExp, `//# sourceMappingURL=${sourceMap.file}.map\n`);
      if (inputFilePath) {
        sourceMap.sources = [inputFilePath];
      } else {
        sourceMap.sources = [''];
      }
    } else {
      // TODO: figure out if we should inline sources here.
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
