import { oneLine, stripIndent } from 'common-tags';

import { transformJavascript } from '../helpers/transform-javascript';
import { getScrubFileTransformer } from './scrub-file';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getScrubFileTransformer] }).content;

describe('scrub-file', () => {
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('decorators', () => {
    it('removes Angular decorators', () => {
      const output = stripIndent`
        import { Injectable } from '@angular/core';
        ${clazz}
      `;
      const input = stripIndent`
        ${output}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('doesn\'t remove non Angular decorators', () => {
      const input = stripIndent`
        import { Injectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }];
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${input}`);
    });

    it('leaves non-Angulars decorators in mixed arrays', () => {
      const input = stripIndent`
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }, { type: NotInjectable }];
      `;
      const output = stripIndent`
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: NotInjectable }];
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });
  });

  describe('propDecorators', () => {
    it('removes Angular propDecorators', () => {
      const output = stripIndent`
        import { Input } from '@angular/core';
        ${clazz}
      `;
      const input = stripIndent`
        ${output}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] }
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('doesn\'t remove non Angular propDecorators', () => {
      const input = stripIndent`
        import { Input } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = { \'ngIf\': [{ type: Input }] };
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${input}`);
    });

    it('leaves non-Angulars propDecorators in mixed arrays', () => {
      const output = stripIndent`
        import { Input } from '@angular/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'notNgIf': [{ type: NotInput }]
        };
      `;
      const input = stripIndent`
        import { Input } from '@angular/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'ngIf': [{ type: Input }],
          'notNgIf': [{ type: NotInput }]
        };
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });
  });

  describe('ctorParameters', () => {
    it('removes empty constructor parameters', () => {
      const output = stripIndent`
        ${clazz}
      `;
      const input = stripIndent`
        ${output}
        Clazz.ctorParameters = function () { return []; };
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('removes non-empty constructor parameters', () => {
      const output = stripIndent`
        ${clazz}
      `;
      const input = stripIndent`
        ${clazz}
        Clazz.ctorParameters = function () { return [{type: Injector}]; };
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('doesn\'t remove constructor parameters from whitelisted classes', () => {
      const input = stripIndent`
        ${clazz.replace('Clazz', 'PlatformRef_')}
        PlatformRef_.ctorParameters = function () { return []; };
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${input}`);
    });
  });
});

