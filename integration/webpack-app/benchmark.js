const fs = require('fs');
const path = require('path');


const ngoDir = path.join(__dirname, 'dist');
const noNgoDir = path.join(__dirname, 'dist-no-ngo');

const ngoSizes = {};
const noNgoSizes = {};
const fileSize = (filename, hash) => hash[filename] = fs.statSync(filename).size;

fs.readdirSync(ngoDir).forEach((file) => fileSize(path.join(ngoDir, file), ngoSizes))
fs.readdirSync(noNgoDir).forEach((file) => fileSize(path.join(noNgoDir, file), noNgoSizes))

console.log('\n\nwebpack-app benchmark:\n');

Object.keys(ngoSizes)
  .filter((filename) => filename.endsWith('.js'))
  .forEach((filename) => {
    const name = path.basename(filename);

    const ngo = ngoSizes[filename];
    const noNgo = noNgoSizes[path.join(noNgoDir, name)];
    const diff = Math.round((1 - noNgo/ngo) * 10000) / 100;

    const ngoGz = ngoSizes[`${filename}.gz`];
    const noNgoGz = noNgoSizes[path.join(noNgoDir, `${name}.gz`)];
    const diffGz = Math.round((1 - noNgoGz/ngoGz) * 10000) / 100;

    console.log(`${name}: ${noNgo} -> ${ngo} bytes (${diff}%), ${noNgoGz} -> ${ngoGz} bytes gzipped (${diffGz}%)`);
  })

  console.log('\n');
