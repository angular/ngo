import * as tmp from 'tmp';
import * as fs from 'fs';

import { foldFile } from './class-fold';


describe('class-fold', () => {
  it('folds static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const input = `
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
    `;
    const output = `
      var Clazz = (function () { function Clazz() { } ${staticProperty}return Clazz; }());
      
    `;

    const tmpFile = tmp.fileSync({ postfix: '.js' }).name;
    fs.writeFileSync(tmpFile, input);

    expect(foldFile(tmpFile, 'spec')).toEqual(output);
  });
});
