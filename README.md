[![CircleCI](https://circleci.com/gh/angular/ngo/tree/master.svg?style=shield)](https://circleci.com/gh/angular/ngo/tree/master)

# Warning
This package is no longer being maitained. It's functionality has been moved to https://github.com/angular/devkit/tree/master/packages/angular_devkit/build_optimizer.

# Angular Optimizer (NGO)

NGO contains Angular optimizations applicable to JavaScript code as a TypeScript transform pipeline.


## Available optimizations

Transformations applied depend on file content:

- [Class fold](#class-fold), [Scrub file](#scrub-file) and [Prefix functions](#prefix-functions): applied to Angular apps and libraries.
- [Import tslib](#import-tslib): applied when TypeScript helpers are found.

Non-transform optimizations are applied via the [Purify Plugin](#purify-plugin).

Some of these optimizations add `/*@__PURE__*/` comments.
These are used by [UglifyJS](https://github.com/mishoo/UglifyJS2) to identify pure functions that can potentially be dropped.


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


### Prefix functions

Adds `/*@__PURE__*/` comments to top level downleveled class declarations and instantiation. 
Webpack library imports are also marked as `/*@__PURE__*/` when used with [Purify Plugin](#purify-plugin).

```
// input
var Clazz = (function () { function Clazz() { } return Clazz; }());
var newClazz = new Clazz();
var newClazzTwo = Clazz();

// output
var Clazz = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; }());
var newClazz = /*@__PURE__*/ new Clazz();
var newClazzTwo = /*@__PURE__*/ Clazz();
```


### Import tslib

TypeScript helpers (`__extends/__decorate/__metadata/__param`) are replaced with `tslib` imports whenever found.

```
// input
var __extends = (this && this.__extends) || function (d, b) {
  for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

// output
import { __extends } from "tslib";
```


### Purify Plugin

Performs regex based replacements on all files that add `/*@__PURE__*/` comments to downleveled classes,  TypeScript 
enums and webpack imports (used with [Prefix functions](#prefix-functions))


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


## Webpack loader and plugin usage:

```
const PurifyPlugin = require('ngo').PurifyPlugin;

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'ngo/webpack-loader'
        options: {
          sourceMap: false
        }
      }
    ]
  },
  plugins: [
    new PurifyPlugin()
  ]
}
```


## CLI usage

```
ngo input.js
ngo input.js output.js
purify input.js
purify input.js output.js
```
