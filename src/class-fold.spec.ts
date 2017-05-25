import { stripIndent } from 'common-tags';
import * as tmp from 'tmp';
import * as fs from 'fs';

import { foldFile } from './class-fold';


describe('class-fold', () => {
  it('works', () => {
    const input =
      'var Clazz = (function () { function Clazz() { } return Clazz; }());\nClazz.prop = 1;';
    const output =
      'var Clazz = (function () { function Clazz() { } Clazz.prop = 1;return Clazz; }());\n';

    const tmpFile = tmp.fileSync({ postfix: '.js' }).name;
    fs.writeFileSync(tmpFile, input);

    expect(foldFile(tmpFile, 'spec')).toEqual(output);
  });
});
