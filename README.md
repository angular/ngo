[![CircleCI](https://circleci.com/gh/angular/ngo/tree/master.svg?style=shield)](https://circleci.com/gh/angular/ngo/tree/master)

# Angular Optimizer (NGO)

NGO contains Angular optimizations applicable to JavaScript code as a TypeScript transform pipeline.

## Available optimizations

### Class fold

Static properties are folded into ES5 classes:

```
// input
var Clazz = (function () { function Clazz() { } return Clazz; }());
Clazz.prop = 1;

// output
var Clazz = (function () { function Clazz() { } Clazz.prop = 1; return Clazz; }());
```

### Scrub file

Angular decorators, property decorators and constructor parameters are removed, while leaving non-Angular ones intact.

```
// input
import { Injectable, Input } from '@angular/core';
import { NotInjectable } from 'another-lib';
var Clazz = (function () { function Clazz() { } return Clazz; }());
Clazz.decorators = [{ type: Injectable }, { type: NotInjectable }];
Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
Clazz.ctorParameters = function () { return [{type: Injector}]; };

// output
import { Injectable, Input } from '@angular/core';
import { NotInjectable } from 'another-lib';
var Clazz = (function () { function Clazz() { } return Clazz; }());
Clazz.decorators = [{ type: NotInjectable }];
```

## Library Usage

```
import { ngo } from './ngo';

const transpiledContent = ngo({ content: input }).content;
```

Available options:
```
export interface NgoOptions {
  content?: string;
  inputFilePath?: string;
  outputFilePath?: string;
  emitSourceMap?: boolean;
  strict?: boolean;
}
```

## Webpack loader usage:

```
"module": {
  "rules": [
    {
      "test": /\.js$/,
      "loader": "ngo-loader"
      "options": {
        sourceMap: false
      }
    },
    ...
  ]
}
```

## CLI usage

```
ngo input.js
ngo input.js output.js
```
