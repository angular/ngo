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
  describe('decorators', () => {
    const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

    it('replaces Angular decorators with spaces', () => {
      const decorators = 'Clazz.decorators = [ { type: Injectable } ];';
      const input = `
        import { Injectable } from '@angular/core';
        ${clazz}
        ${decorators}
      `;
      const output = input.replace(decorators, repeatSpace(decorators.length));

      const tmpFile = tmp.fileSync({ postfix: '.js' }).name;
      fs.writeFileSync(tmpFile, input);

      expect(scrubFile(tmpFile, 'spec')).toEqual(output);
    });

    it('doesn\'t replace non Angular decorators', () => {
      const decorators = 'Clazz.decorators = [ { type: Injectable } ];';
      const input = `
        import { Injectable } from 'another-lib';
        ${clazz}
        ${decorators}
      `;

      const tmpFile = tmp.fileSync({ postfix: '.js' }).name;
      fs.writeFileSync(tmpFile, input);

      expect(scrubFile(tmpFile, 'spec')).toEqual(input);
    });

    it('leaves non-Angulars decorators in mixed arrays', () => {
      const angularDecorator = '{ type: Injectable }';
      const decorators = `Clazz.decorators = [ ${angularDecorator}, { type: NotInjectable } ];`;
      const input = `
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        ${decorators}
      `;
      const output = input.replace(angularDecorator, repeatSpace(angularDecorator.length));

      const tmpFile = tmp.fileSync({ postfix: '.js' }).name;
      fs.writeFileSync(tmpFile, input);

      expect(scrubFile(tmpFile, 'spec')).toEqual(output);
    });
  });
});

