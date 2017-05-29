const config = require('./webpack.config.common.js');

config.module.rules.push({ test: /\.ts$/, use: ['ngo-loader', '@ngtools/webpack'] })
config.module.rules.push({ test: /\.js$/, loader: 'ngo-loader' })

module.exports = config;