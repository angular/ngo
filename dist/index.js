"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var scrub_file_1 = require("./scrub-file");
var class_fold_1 = require("./class-fold");
var HAS_DECORATORS = /decorators/;
var HAS_CTOR_PARAMETERS = /ctorParameters/;
function default_1(content) {
    if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
        return util_1.transformJavascript(content, [scrub_file_1.getScrubFileTransformer, class_fold_1.getFoldFileTransformer]).content;
    }
    return content;
}
exports.default = default_1;
