const path = require('path');
const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      "querystring": require.resolve('querystring/'),
      "fs": false,
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "assert": require.resolve("assert/"),
      "url": require.resolve("url/"),
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "vm": require.resolve("vm-browserify"),
      "process": require.resolve("process/browser"),
      "net": require.resolve("net-browserify"),
      "tls": require.resolve("tls-browserify"),
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
}; 