import * as ts from 'typescript';
import { NgoOptions } from './ngo';
export interface TransformJavascriptOptions extends NgoOptions {
    content: string;
    getTransforms: Array<(program: ts.Program) => ts.TransformerFactory<ts.SourceFile>>;
}
export declare const transformJavascript: (options: TransformJavascriptOptions) => {
    content: string;
    sourceMap: any;
};
