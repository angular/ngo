import * as ts from 'typescript';

import { transformJavascript } from './util';
import { getScrubFileTransformer } from './ngo';
import { getFoldFileTransformer } from './class-fold';

const HAS_DECORATORS = /decorators/;
const HAS_CTOR_PARAMETERS = /ctorParameters/;

module.exports = function (content: string) {
  if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
    return transformJavascript(content, [getScrubFileTransformer, getFoldFileTransformer]).content;
  }
  return content;
}
