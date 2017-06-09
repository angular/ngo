import * as ts from 'typescript';
export declare function getPrefixFunctionsTransformer(): ts.TransformerFactory<ts.SourceFile>;
export declare function findTopLevelFunctions(parentNode: ts.Node): ts.Node[];
export declare function findPureImports(parentNode: ts.Node): string[];
