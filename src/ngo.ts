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
const HAS_TS_HELPERS = /var (__extends|__decorate|__metadata|__param) = /;

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

  // Determine which transforms to apply.
  const getTransforms = [];

  if (HAS_TS_HELPERS.test(content)) {
    getTransforms.push(getImportTslibTransformer);
  }


  if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
    // Order matters, getPrefixFunctionsTransformer needs to be called before getFoldFileTransformer.
    getTransforms.push(...[
      getPrefixFunctionsTransformer,
      getScrubFileTransformer,
      getFoldFileTransformer,
    ]);
  }

  if (getTransforms.length > 0) {
    // Only transform if there are transforms to apply.
    return transformJavascript({
      content,
      getTransforms,
      emitSourceMap,
      inputFilePath,
      outputFilePath,
      strict,
    });
  } else if (emitSourceMap) {
    // Emit a sourcemap with no changes.
    const ms = new MagicString(content);
    return {
      content,
      sourceMap: ms.generateMap({
        source: inputFilePath,
        file: outputFilePath ? `${outputFilePath}.map` : null,
        includeContent: true,
      }),
    };
  } else {
    return {
      content,
      sourceMap: null,
    };
  }
}
