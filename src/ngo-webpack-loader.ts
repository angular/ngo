import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
const loaderUtils = require('loader-utils');

import { ngo } from './ngo';


interface NgoLoaderOptions {
  sourceMap: boolean;
}

export default function ngoLoader(content: string, previousSourceMap: RawSourceMap) {
  this.cacheable();
  const options: NgoLoaderOptions = loaderUtils.getOptions(this);

  const ngoOutput = ngo({ content, emitSourceMap: options.sourceMap });
  const intermediateSourceMap = ngoOutput.sourceMap;
  let newContent = ngoOutput.content;

  let newSourceMap = null;

  if (options.sourceMap && intermediateSourceMap) {
    // Webpack doesn't need sourceMappingURL since we pass them on explicitely.
    newContent = newContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');

    if (!previousSourceMap) {
      // If we're emitting sourcemaps but there is no previous one, then we're the first loader.
      newSourceMap = intermediateSourceMap;
    } else {
      // If there's a previous sourcemap, we're an intermediate loader and we have to chain them.
      // Fill in the intermediate sourcemap source as the previous sourcemap file.
      intermediateSourceMap.sources = [previousSourceMap.file];
      intermediateSourceMap.file = previousSourceMap.file;

      // Chain the sourcemaps.
      const consumer = new SourceMapConsumer(intermediateSourceMap);
      const generator = SourceMapGenerator.fromSourceMap(consumer);
      generator.applySourceMap(new SourceMapConsumer(previousSourceMap));
      newSourceMap = generator.toJSON();
    }
  }

  this.callback(null, newContent, newSourceMap);
}

// TODO: investigate weird extra maps at webpack:// root
// without ngo: main.bundle.js, vendor.bundle.js
// with ngo: app.module.ngfactory.js, main.bundle.js, null?37a6, vendor.bundle.js
