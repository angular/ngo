import * as ts from 'typescript';
export declare function getScrubFileTransformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile>;
export declare function expect<T extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind): T;
