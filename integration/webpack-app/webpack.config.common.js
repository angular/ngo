const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ngToolsWebpack = require('@ngtools/webpack');
const CompressionPlugin = require('compression-webpack-plugin');


const src = path.resolve(__dirname, 'src/');
const dist = path.resolve(__dirname, 'dist/');

module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: path.join(src, 'main.ts'),
  output: {
    path: dist,
    filename: '[name].bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(src, 'index.html')
    }),
    new ngToolsWebpack.AotPlugin({
      tsConfigPath: path.join(src, 'tsconfig.json')
    }),
    new CompressionPlugin({
        asset: '[path].gz[query]',
        algorithm: 'gzip',
        test: /\.js$/,
        threshold: 0,
        minRatio: 0.8
    })
  ],
  module: {
    rules: [
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loader: 'raw-loader' }
    ]
  }
};
