import { ngo } from './ngo';


export function ngoLoader(content: string, map: object) {
  // TODO: process incoming sourcemaps, provide sourcemaps.
  this.callback(null, ngo(content), map);
}
