const fs = require('fs');
const path = require('path');


const ngoDir = path.join(__dirname, 'dist');
const noNgoDir = path.join(__dirname, 'dist-no-ngo');

const ngoSizes = {};
const noNgoSizes = {};
const fileSize = (filename, hash) => hash[filename] = fs.statSync(filename).size;
const sizeDiff = (oldSize, newSize) => Math.round((1 - oldSize / newSize) * 10000) / 100;

fs.readdirSync(ngoDir).forEach((file) => fileSize(path.join(ngoDir, file), ngoSizes))
fs.readdirSync(noNgoDir).forEach((file) => fileSize(path.join(noNgoDir, file), noNgoSizes))

let ngoTotal = 0;
let noNgoTotal = 0;
let ngoGzTotal = 0;
let noNgoGzTotal = 0;
console.log('\n\nwebpack-app benchmark:\n');


Object.keys(ngoSizes)
  .filter((filename) => filename.endsWith('.js'))
  .forEach((filename) => {
    const name = path.basename(filename);

    const ngo = ngoSizes[filename];
    const noNgo = noNgoSizes[path.join(noNgoDir, name)];
    const diff = sizeDiff(noNgo, ngo);

    const ngoGz = ngoSizes[`${filename}.gz`];
    const noNgoGz = noNgoSizes[path.join(noNgoDir, `${name}.gz`)];
    const diffGz = sizeDiff(noNgoGz, ngoGz);

    ngoTotal += ngo;
    noNgoTotal += noNgo;
    ngoGzTotal += ngoGz;
    noNgoGzTotal += noNgoGz;

    console.log(`${name}: ${noNgo} -> ${ngo} bytes (${diff}%), ${noNgoGz} -> ${ngoGz} bytes gzipped (${diffGz}%)`);
  });

const diffTotal = sizeDiff(noNgoTotal, ngoTotal);
const diffGzTotal = sizeDiff(noNgoGzTotal, ngoGzTotal);

console.log(`\nTotal: ${noNgoTotal} -> ${ngoTotal} bytes (${diffTotal}%), ${noNgoGzTotal} -> ${ngoGzTotal} bytes gzipped (${diffGzTotal}%)`);

if (diffTotal > -1 && diffTotal < 1) {
  throw new Error('Total difference of size is too small, ngo-loader does not seem to have made any optimizations');
}

console.log('\n');
