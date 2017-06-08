import { readFileSync } from 'fs';
import { RawSourceMap } from 'source-map';
const MagicString = require('magic-string');

import { getFoldFileTransformer } from './class-fold';
import { getImportTslibTransformer } from './import-tslib';
import { getPrefixFunctionsTransformer } from './prefix-functions';
import { getScrubFileTransformer } from './scrub-file';
import { transformJavascript } from './transform-javascript';


const HAS_DECORATORS = /decorators/;
const HAS_CTOR_PARAMETERS = /ctorParameters/;

export interface NgoOptions {
  content?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
}

export function ngo(options: NgoOptions): { content: string, sourceMap: RawSourceMap | null } {
  options.emitSourceMap = !!options.emitSourceMap;
  const { inputFilePath, emitSourceMap, outputFilePath, strict } = options;
  let { content } = options;

  if (!inputFilePath && !content) {
    throw new Error('Either filePath or content must be specified in options.');
  }

  if (!content) {
    content = readFileSync(inputFilePath as string, 'UTF-8');
  }

  if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
    return transformJavascript({
      content,
      // Order matters, getPrefixFunctionsTransformer needs to be called before getFoldFileTransformer.
      getTransforms: [
        getImportTslibTransformer,
        getPrefixFunctionsTransformer,
        getScrubFileTransformer,
        getFoldFileTransformer,
      ],
      emitSourceMap,
      inputFilePath,
      outputFilePath,
      strict,
    });
  }

  if (emitSourceMap) {
    // Emit a sourcemap with no changes.
    const ms = new MagicString(content);
    return {
      content,
      sourceMap: ms.generateMap({
        source: inputFilePath,
        file: outputFilePath ? `${outputFilePath}.map` : null,
        includeContent: true,
        hires: true,
      }),
    };
  } else {
    return {
      content,
      sourceMap: null,
    };
  }
}
