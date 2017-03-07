import * as ts from 'typescript';
import {scrubFile} from './ngo';
const tmp = require('tmp');
const fs = require('fs');

module.exports = function(content: string) {
  const tmpFile = tmp.fileSync({postfix: '.js'}).name;
  console.log('temp file', this.request, tmpFile);
  fs.writeFileSync(tmpFile, content);
  return scrubFile(tmpFile, this.request);
}
