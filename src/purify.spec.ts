import { oneLine, stripIndent } from 'common-tags';

import { purify } from './purify';


describe('purify', () => {
  it('wraps ts 2.2 enums in IIFE', () => {
    const input = stripIndent`
      var ChangeDetectionStrategy = {};
      ChangeDetectionStrategy.OnPush = 0;
      ChangeDetectionStrategy.Default = 1;
      ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = "OnPush";
      ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = "Default";
    `;
    const output = stripIndent`
      var ChangeDetectionStrategy = /*@__PURE__*/(function() {
      var ChangeDetectionStrategy = {};
      ChangeDetectionStrategy.OnPush = 0;
      ChangeDetectionStrategy.Default = 1;
      ChangeDetectionStrategy[ChangeDetectionStrategy.OnPush] = "OnPush";
      ChangeDetectionStrategy[ChangeDetectionStrategy.Default] = "Default";;
      return ChangeDetectionStrategy;})();
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('wraps ts 2.3 enums in IIFE', () => {
    const input = stripIndent`
      var ChangeDetectionStrategy;
      (function (ChangeDetectionStrategy) {
        ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
        ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
      })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
    `;
    const output = stripIndent`
      var ChangeDetectionStrategy = /*@__PURE__*/(function() {
          var ChangeDetectionStrategy = {};
          ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
          ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
          return ChangeDetectionStrategy;
      })();
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefixes safe imports with /*@__PURE__*/', () => {
    const input = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_Subject__ = __webpack_require__("EEr4");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_http__ = __webpack_require__(72);
      /** PURE_IMPORTS_START rxjs_Subject,_angular_http PURE_IMPORTS_END */
    `;
    const output = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_rxjs_Subject__ = /*@__PURE__*/__webpack_require__("EEr4");
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_http__ = /*@__PURE__*/__webpack_require__(72);
      /** PURE_IMPORTS_START rxjs_Subject,_angular_http PURE_IMPORTS_END */
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefixes safe default imports with /*@__PURE__*/', () => {
    // tslint:disable:max-line-length
    const input = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_zone_js___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_zone_js__);
      /** PURE_IMPORTS_START zone_js PURE_IMPORTS_END */
    `;
    const output = stripIndent`
      /* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_zone_js___default = /*@__PURE__*/__webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_zone_js__);
      /** PURE_IMPORTS_START zone_js PURE_IMPORTS_END */
    `;
    // tslint:enable:max-line-length

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('prefix CCF and CMF statements', () => {
    const input = stripIndent`
      var AppComponentNgFactory = __WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵccf */]('app-root');
      var AppModuleNgFactory = __WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵcmf */]('app-root');
    `;
    const output = stripIndent`
      var AppComponentNgFactory = /*@__PURE__*/__WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵccf */]('app-root');
      var AppModuleNgFactory = /*@__PURE__*/__WEBPACK_IMPORTED_MODULE_1__angular_core__["I" /* ɵcmf */]('app-root');
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });

  it('removes licenses', () => {
    const input = stripIndent`
      /**
      *@license
      *Copyright Google Inc. All Rights Reserved.
      *
      *Use of this source code is governed by an MIT-style license that can be
      *found in the LICENSE file at https://angular.io/license
      */
    `;
    const output = stripIndent`
    `;

    expect(oneLine`${purify(input)}`).toEqual(oneLine`${output}`);
  });
});
