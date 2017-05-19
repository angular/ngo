import * as fs from 'fs';
import {scrubFile} from './ngo';
import {foldFile} from './class-fold';

const file = process.argv[2];

const tmp = file + '.tmp.js';
fs.writeFileSync(tmp, scrubFile(file, file));
process.stdout.write(foldFile(tmp, file));
fs.unlinkSync(tmp);
