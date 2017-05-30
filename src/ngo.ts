import { getFoldFileTransformer } from './class-fold';
import { getScrubFileTransformer } from './scrub-file';
import { transformJavascript } from './transform-javascript';


const HAS_DECORATORS = /decorators/;
const HAS_CTOR_PARAMETERS = /ctorParameters/;

export function ngo(content: string, emitSourceMap = false): { content: string, sourceMap: object | null } {
  if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
    return transformJavascript(content, [getScrubFileTransformer, getFoldFileTransformer], emitSourceMap);
  }
  return {
    content,
    // TODO: emit a sourcemap where nothing changes instead, but don't know how.
    sourceMap: null,
  };
}
