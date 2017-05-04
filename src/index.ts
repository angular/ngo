import * as ts from 'typescript';
import {scrubFile} from './ngo';
const tmp = require('tmp');
const fs = require('fs');

const HAS_DECORATORS = /decorators/;
const HAS_CTOR_PARAMETERS = /ctorParameters/;

module.exports = function(content: string) {
  if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
    const tmpFile = tmp.fileSync({postfix: '.js'}).name;
    console.log('temp file', this.request, tmpFile);
    fs.writeFileSync(tmpFile, content);
    return scrubFile(tmpFile, this.request);
  }
  return content;
}
