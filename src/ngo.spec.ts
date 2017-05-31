import { oneLine } from 'common-tags';

import { ngo } from './ngo';


describe('ngo', () => {
  const imports = 'import { Injectable, Input } from \'@angular/core\';';
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';
  const staticProperty = 'Clazz.prop = 1;';
  const decorators = 'Clazz.decorators = [ { type: Injectable } ];';

  describe('basic functionality', () => {
    it('applies class-fold and scrub-file', () => {
      const input = oneLine`
        ${imports}
        ${clazz}
        ${staticProperty}
        ${decorators}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
        Clazz.ctorParameters = function () { return [{type: Injector}]; };
      `;
      const output = oneLine`
        ${imports}
        var Clazz = (function () { function Clazz() { } ${staticProperty} return Clazz; }());
      `;

      expect(oneLine`${ngo({ content: input }).content}`).toEqual(output);
    });

    it('doesn\'t process files without decorators/ctorParameters', () => {
      const input = oneLine`
        var Clazz = (function () { function Clazz() { } return Clazz; }());
        ${staticProperty}
      `;

      expect(oneLine`${ngo({ content: input }).content}`).toEqual(input);
    });
  });


  describe('resilience', () => {
    it('doesn\'t process files with invalid syntax by default', () => {
      const input = oneLine`
        $\123))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(oneLine`${ngo({ content: input }).content}`).toEqual(input);
    });

    it('throws on files with invalid syntax in strict mode', () => {
      const input = oneLine`
        $\123))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(() => ngo({ content: input, strict: true })).toThrow();
    });
  });

});



