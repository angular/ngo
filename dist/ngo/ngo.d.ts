import { RawSourceMap } from 'source-map';
export interface NgoOptions {
    content?: string;
    inputFilePath?: string;
    outputFilePath?: string;
    emitSourceMap?: boolean;
    strict?: boolean;
}
export declare function ngo(options: NgoOptions): {
    content: string;
    sourceMap: RawSourceMap | null;
};
