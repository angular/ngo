import { oneLine } from 'common-tags';

import { getFoldFileTransformer } from './class-fold';
import { transformJavascript } from './transform-javascript';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getFoldFileTransformer] }).content;

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

    expect(oneLine`${transform(input)}`).toEqual(output);
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

    expect(oneLine`${transform(input)}`).toEqual(output);
  });

  // TODO: add some tests for resilience to input.
});
