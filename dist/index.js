"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var ngo_1 = require("./ngo");
var class_fold_1 = require("./class-fold");
var HAS_DECORATORS = /decorators/;
var HAS_CTOR_PARAMETERS = /ctorParameters/;
module.exports = function (content) {
    if (HAS_DECORATORS.test(content) || HAS_CTOR_PARAMETERS.test(content)) {
        return util_1.transformJavascript(content, [ngo_1.getScrubFileTransformer, class_fold_1.getFoldFileTransformer]).content;
    }
    return content;
};
