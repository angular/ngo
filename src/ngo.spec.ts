import * as tmp from 'tmp';
import * as fs from 'fs';

import { scrubFile } from './ngo';

const spaceReplacer = (match) => match.replace(/[^ \t\r\n]/g, ' ');
const scrubFileContents = (content) => {
  const filePath = tmp.fileSync({ postfix: '.js' }).name;
  fs.writeFileSync(filePath, content);
  return scrubFile(filePath, 'spec');
}

describe('ngo', () => {
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('decorators', () => {
    it('replaces Angular decorators with spaces', () => {
      const decorators = 'Clazz.decorators = [ { type: Injectable } ];';
      const input = `
        import { Injectable } from '@angular/core';
        ${clazz}
        ${decorators}
      `;
      const output = input.replace(decorators, spaceReplacer);

      expect(scrubFileContents(input)).toEqual(output);
    });

    it('doesn\'t replace non Angular decorators', () => {
      const decorators = 'Clazz.decorators = [ { type: Injectable } ];';
      const input = `
        import { Injectable } from 'another-lib';
        ${clazz}
        ${decorators}
      `;

      expect(scrubFileContents(input)).toEqual(input);
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
      const output = input.replace(angularDecorator, spaceReplacer);

      expect(scrubFileContents(input)).toEqual(output);
    });
  });

  describe('ctorParameters', () => {
    it('removes empty constructor parameters', () => {
      const ctorParameters = 'Clazz.ctorParameters = function () { return []; };';
      const input = `
        ${clazz}
        ${ctorParameters}
      `;
      const output = input.replace(ctorParameters, spaceReplacer);

      expect(scrubFileContents(input)).toEqual(output);
    });

    it('removes non-empty constructor parameters', () => {
      const ctorParameters = `Clazz.ctorParameters = function () { return [{type: Injector}]; };`;
      const input = `
        ${clazz}
        ${ctorParameters}
      `;
      const output = input.replace(ctorParameters, spaceReplacer);

      expect(scrubFileContents(input)).toEqual(output);
    });

    it('doesn\'t remove constructor parameters from whitelisted classes', () => {
      const ctorParameters = 'PlatformRef_.ctorParameters = function () { return []; };';
      const input = `
        ${clazz.replace('Clazz', 'PlatformRef_')}
        ${ctorParameters}
      `;

      expect(scrubFileContents(input)).toEqual(input);
    });
  });
});

