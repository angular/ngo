import { purify } from './purify';


export class PurifyPlugin {
  constructor() { }

  public apply(compiler: any): void {
    compiler.plugin('compilation', (compilation: any) => {
      compilation.plugin('optimize-chunk-assets', (chunks: any, callback: any) => {
        chunks.forEach((chunk: any) => {
          chunk.files.filter((fileName: string) => fileName.endsWith('.bundle.js')).forEach((fileName: string) => {
            const purifiedSource = purify(compilation.assets[fileName].source());
            compilation.assets[fileName]._cachedSource = purifiedSource;
            compilation.assets[fileName]._source.source = () => purifiedSource;
          });
        });
        callback();
      });
    });
  }
}

