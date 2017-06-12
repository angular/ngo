const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ngToolsWebpack = require('@ngtools/webpack');
const CompressionPlugin = require('compression-webpack-plugin');


const src = path.resolve(__dirname, 'src/');
const dist = path.resolve(__dirname, 'dist/');
const nodeModules = path.resolve(__dirname, 'node_modules/');
const genDirNodeModules = path.resolve(__dirname, 'src', '$$_gendir');

module.exports = {
  devtool: 'sourcemap',
  stats: {
    colors: true,
    hash: true,
    timings: true,
    chunks: false,
    chunkModules: false,
    children: false,
    modules: false,
    reasons: false,
    warnings: true,
    assets: false,
    version: false
  },
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
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      chunks: ['main'],
      minChunks: (module) => module.resource &&
        (module.resource.startsWith(nodeModules) || module.resource.startsWith(genDirNodeModules))
    }),
    new CompressionPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: /\.js$/,
      threshold: 0,
      minRatio: 0.8
    }),
    new webpack.optimize.UglifyJsPlugin({
      mangle: { screw_ie8: true },
      compress: { screw_ie8: true, warnings: false, pure_getters: true },
      sourceMap: true,
      comments: false
    })
  ],
  module: {
    rules: [
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loader: 'raw-loader' }
    ]
  }
};
