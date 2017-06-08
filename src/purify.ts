// This matches a comment left by the ngo-loader that contains pure import paths
const importCommentRegex = /\/\*\* PURE_IMPORTS_START (\S+) PURE_IMPORTS_END \*\//mg;

// TODO: handle sourcemaps
export function purify(content: string) {

  const pureImportMatches = getMatches(content, importCommentRegex, 1).join('|');

  const newContent = content
    /* wrap TS 2.2 enums w/ an IIFE */
    .replace(
      /var (\S+) = \{\};\n(\1\.(\S+) = \d+;\n)+\1\[\1\.(\S+)\] = "\4";\n(\1\[\1\.(\S+)\] = "\S+";\n*)+/mg,
      'var $1 = /*@__PURE__*/(function() {\n$&; return $1;})();\n',
    )
    /* wrap TS 2.3 enums w/ an IIFE */
    .replace(
      // tslint:disable-next-line:max-line-length
      /var (\S+);(\/\*@__PURE__\*\/)*\n\(function \(\1\) \{\s+(\1\[\1\["(\S+)"\] = 0\] = "\4";(\s+\1\[\1\["\S+"\] = \d\] = "\S+";)*\n)\}\)\(\1 \|\| \(\1 = \{\}\)\);/mg,
      'var $1 = /*@__PURE__*/(function() {\n    var $1 = {};\n    $3    return $1;\n})();',
    )
    /* Prefix safe imports with pure */
    .replace(
      new RegExp(`(_(${pureImportMatches})__ = )(__webpack_require__\\("\\S+"\\));`, 'mg'),
      '$1/*@__PURE__*/$3',
    )
    /* Prefix default safe imports with pure */
    .replace(
      new RegExp(`(_(${pureImportMatches})___default = )(__webpack_require__\\.\\w\\(\\S+\\));`, 'mg'),
      '$1/*@__PURE__*/$3',
    )
    /* Prefix CCF and CMF statements */
    .replace(
      /__WEBPACK_IMPORTED_MODULE_0__angular_core__\["_\w+" \/\* (ɵccf|ɵcmf) \*\/\]\(/mg,
      '/*@__PURE__*/$&',
    )
    .replace(
      /\/\*\*\n\s+\* @license.*\n(\s+\*[^\/].*\n)*\s+\*\//mg,
      '\n',
    );

  return newContent;
}

function getMatches(str: string, regex: RegExp, index: number) {
  let matches: string[] = [];
  let match;
  // tslint:disable-next-line:no-conditional-assignment
  while (match = regex.exec(str)) {
    matches = matches.concat(match[index].split(','));
  }
  return matches;
}
