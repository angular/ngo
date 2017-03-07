import * as fs from 'fs';
import {scrubFile} from './ngo';

process.stdout.write(scrubFile('./button.js', 'button.js'));
