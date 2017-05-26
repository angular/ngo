import { oneLine } from 'common-tags';

import { transformJavascript } from './util';
import { getScrubFileTransformer } from './ngo';


describe('ngo', () => {
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('decorators', () => {
    it('removes Angular decorators', () => {
      const output = oneLine`
        import { Injectable } from '@angular/core';
        ${clazz}
      `;
      const input = oneLine`
        ${output}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(output);
    });

    it('doesn\'t remove non Angular decorators', () => {
      const input = oneLine`
        import { Injectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }];
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(input);
    });

    it('leaves non-Angulars decorators in mixed arrays', () => {
      const input = oneLine`
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }, { type: NotInjectable }];
      `;
      const output = oneLine`
        import { Injectable } from '@angular/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: NotInjectable }];
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(output);
    });
  });

  describe('propDecorators', () => {
    it('removes Angular propDecorators', () => {
      const output = oneLine`
        import { Input } from '@angular/core';
        ${clazz}
      `;
      const input = oneLine`
        ${output}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] }
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(output);
    });

    it('doesn\'t remove non Angular propDecorators', () => {
      const input = oneLine`
        import { Input } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = { \'ngIf\': [{ type: Input }] };
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(input);
    });

    it('leaves non-Angulars propDecorators in mixed arrays', () => {
      const output = oneLine`
        import { Input } from '@angular/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'notNgIf': [{ type: NotInput }]
        };
      `;
      const input = oneLine`
        import { Input } from '@angular/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'ngIf': [{ type: Input }],
          'notNgIf': [{ type: NotInput }]
        };
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(output);
    });
  });

  describe('ctorParameters', () => {
    it('removes empty constructor parameters', () => {
      const output = oneLine`
        ${clazz}
      `;
      const input = oneLine`
        ${output}
        Clazz.ctorParameters = function () { return []; };
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(output);
    });

    it('removes non-empty constructor parameters', () => {
      const ctorParameters = `Clazz.ctorParameters = function () { return [{type: Injector}]; };`;
      const output = oneLine`
        ${clazz}
      `;
      const input = oneLine`
        ${clazz}
        Clazz.ctorParameters = function () { return [{type: Injector}]; };
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(output);
    });

    it('doesn\'t remove constructor parameters from whitelisted classes', () => {
      const ctorParameters = 'PlatformRef_.ctorParameters = function () { return []; };';
      const input = oneLine`
        ${clazz.replace('Clazz', 'PlatformRef_')}
        PlatformRef_.ctorParameters = function () { return []; };
      `;

      const transformedInput = transformJavascript(input, [getScrubFileTransformer]);
      expect(oneLine`${transformedInput}`).toEqual(input);
    });
  });
});

