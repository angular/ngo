import * as tmp from 'tmp';
import * as fs from 'fs';

import { scrubFile } from './ngo';


function repeatSpace(count: number) {
  let space = '';
  for (let i = 0; i < count; i++) {
    space += ' ';
  }
  return space;
}

describe('ngo', () => {
  it('replaces decorators with spaces', () => {
    const decorator = 'Clazz.decorators = [ { type: Injectable } ];';
    const input = `
      import { Injectable } from '@angular/core';var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${decorator}
    `;
    const output = input.replace(decorator, repeatSpace(decorator.length));

    const tmpFile = tmp.fileSync({ postfix: '.js' }).name;
    fs.writeFileSync(tmpFile, input);

    expect(scrubFile(tmpFile, 'spec')).toEqual(output);
  });
});

