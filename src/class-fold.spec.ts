import { oneLine } from 'common-tags';

import { transformJavascript } from './spec-helpers';
import { getFoldFileTransformer } from './class-fold';


describe('class-fold', () => {
  it('folds static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const input = oneLine`
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
    `;
    const output = oneLine`
      var Clazz = (function () { function Clazz() { } 
      ${staticProperty} return Clazz; }());
    `;

    const transformedInput = transformJavascript(input, getFoldFileTransformer);
    expect(oneLine`${transformedInput}`).toEqual(output);
  });

  it('folds multiple static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const anotherStaticProperty = 'Clazz.anotherProp = 2;';
    const input = oneLine`
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
      ${anotherStaticProperty}
    `;
    const output = oneLine`
      var Clazz = (function () { function Clazz() { } 
      ${staticProperty} ${anotherStaticProperty} return Clazz; }());
    `;

    const transformedInput = transformJavascript(input, getFoldFileTransformer);
    expect(oneLine`${transformedInput}`).toEqual(output);
  });

  // TODO: add some tests for resilience to input.
});
