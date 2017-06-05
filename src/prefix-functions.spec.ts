import { oneLine } from 'common-tags';

import { getPrefixFunctionsTransformer } from './prefix-functions';
import { transformJavascript } from './transform-javascript';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getPrefixFunctionsTransformer] }).content;

describe('prefix-functions', () => {
  const emptyImportsComment = '/*PURE_IMPORTS_START PURE_IMPORTS_END*/';
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('pure imports', () => {
    it('adds import list', () => {
      const input = oneLine`
        import { Injectable } from '@angular/core';
        var foo = Injectable;
      `;
      const output = oneLine`
        /*PURE_IMPORTS_START _angular_core PURE_IMPORTS_END*/
        ${input}
      `;

      expect(oneLine`${transform(input)}`).toEqual(output);
    });

    it('adds import list even with no imports', () => {
      const input = oneLine`
        var foo = 42;
      `;
      const output = oneLine`
        ${emptyImportsComment}
        ${input}
      `;

      expect(oneLine`${transform(input)}`).toEqual(output);
    });
  });

  describe('pure functions', () => {
    it('adds comment to new calls', () => {
      const input = oneLine`
        var newClazz = new Clazz();
      `;
      const output = oneLine`
        ${emptyImportsComment}
        var newClazz = /*@__PURE__*/ new Clazz();
      `;

      expect(oneLine`${transform(input)}`).toEqual(output);
    });

    it('adds comment to function calls', () => {
      const input = oneLine`
        var newClazz = Clazz();
      `;
      const output = oneLine`
        ${emptyImportsComment}
        var newClazz = /*@__PURE__*/ Clazz();
      `;

      expect(oneLine`${transform(input)}`).toEqual(output);
    });

    it('adds comment outside of IIFEs', () => {
      const input = oneLine`
        ${clazz}
        var ClazzTwo = (function () { function Clazz() { } return Clazz; })();
      `;
      const output = oneLine`
        ${emptyImportsComment}
        var Clazz = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; }());
        var ClazzTwo = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; })();
      `;

      expect(oneLine`${transform(input)}`).toEqual(output);
    });

    it('doesn\'t adds comment when inside function declarations or expressions', () => {
      const input = oneLine`
        function funcDecl() {
          var newClazz = Clazz();
          var newClazzTwo = new Clazz();
        }

        var funcExpr = function () {
          var newClazz = Clazz();
          var newClazzTwo = new Clazz();
        };
      `;
      const output = oneLine`
        ${emptyImportsComment}
        ${input}
      `;

      expect(oneLine`${transform(input)}`).toEqual(output);
    });
  });
});
