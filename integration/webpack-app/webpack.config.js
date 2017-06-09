const PurifyPlugin = require('ngo-loader').PurifyPlugin;

const config = require('./webpack.config.common.js');

const ngoLoaderRule = {
  loader: 'ngo-loader',
  options: {
    sourceMap: true
  }
}

config.module.rules.push({ test: /\.ts$/, use: [ngoLoaderRule, '@ngtools/webpack'] })
config.module.rules.push({ test: /\.js$/, use: [ngoLoaderRule] })
config.plugins.unshift(new PurifyPlugin());

module.exports = config;
