import * as ts from 'typescript';
export interface TransformJavascriptOptions {
    content: string;
    inputFilePath?: string;
    outputFilePath?: string;
    emitSourceMap?: boolean;
    strict?: boolean;
    getTransforms: Array<(program: ts.Program) => ts.TransformerFactory<ts.SourceFile>>;
}
export declare const transformJavascript: (options: TransformJavascriptOptions) => {
    content: string;
    sourceMap: any;
};
