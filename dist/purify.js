"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// This matches a comment left by the ngo-loader that contains pure import paths
var importCommentRegex = /\/\*\* PURE_IMPORTS_START (\S+) PURE_IMPORTS_END \*\//mg;
// TODO: handle sourcemaps
function purify(content) {
    var pureImportMatches = getMatches(content, importCommentRegex, 1).join('|');
    var newContent = content
        .replace(
    // tslint:disable-next-line:max-line-length
    /^(var (\S+) = )(\(function \(\) \{\r?\n(?:    (?:\/\*\*| \*|\*\/|\/\/)[^\r?\n]*\r?\n)*    function \2\([^\)]*\) \{\r?\n)/mg, '$1/*@__PURE__*/$3')
        .replace(/^(var (\S+) = )(\(function \(_super\) \{\r?\n    \w*__extends\(\w+, _super\);\r?\n)/mg, '$1/*@__PURE__*/$3')
        .replace(/var (\S+) = \{\};\r?\n(\1\.(\S+) = \d+;\r?\n)+\1\[\1\.(\S+)\] = "\4";\r?\n(\1\[\1\.(\S+)\] = "\S+";\r?\n*)+/mg, 'var $1 = /*@__PURE__*/(function() {\n$&; return $1;})();\n')
        .replace(
    // tslint:disable-next-line:max-line-length
    /var (\S+);(\/\*@__PURE__\*\/)*\r?\n\(function \(\1\) \{\s+(\1\[\1\["(\S+)"\] = 0\] = "\4";(\s+\1\[\1\["\S+"\] = \d\] = "\S+";)*\r?\n)\}\)\(\1 \|\| \(\1 = \{\}\)\);/mg, 'var $1 = /*@__PURE__*/(function() {\n    var $1 = {};\n    $3    return $1;\n})();')
        .replace(new RegExp("(_(" + pureImportMatches + ")__ = )(__webpack_require__\\(\\S+\\);)", 'mg'), '$1/*@__PURE__*/$3')
        .replace(new RegExp("(_(" + pureImportMatches + ")___default = )(__webpack_require__\\.\\w\\(\\S+\\);)", 'mg'), '$1/*@__PURE__*/$3')
        .replace(/\w*__WEBPACK_IMPORTED_MODULE_\d+__angular_core__\["\w+" \/\* (ɵccf|ɵcmf) \*\/\]\(/mg, '/*@__PURE__*/$&')
        .replace(/new \w*__WEBPACK_IMPORTED_MODULE_\d+__angular_core__\["\w+" \/\* NgModuleFactory \*\/\]/mg, '/*@__PURE__*/$&');
    return newContent;
}
exports.purify = purify;
function getMatches(str, regex, index) {
    var matches = [];
    var match;
    // tslint:disable-next-line:no-conditional-assignment
    while (match = regex.exec(str)) {
        matches = matches.concat(match[index].split(','));
    }
    return matches;
}
//# sourceMappingURL=purify.js.map