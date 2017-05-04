import * as fs from 'fs';
import {scrubFile} from './ngo';

const file = process.argv[2];

process.stdout.write(scrubFile(file, file));
