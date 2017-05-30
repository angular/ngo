import { ngo } from './ngo';


export function ngoLoader(content: string, map: {[key: string]: any}) {
  // TODO: process incoming sourcemaps, provide sourcemaps.
  // transformedContent = transformedContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
  this.callback(null, ngo(content), map);
}
