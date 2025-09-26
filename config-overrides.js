const webpack = require('webpack');

module.exports = function override(config) {
  // Add fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
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
    "process": require.resolve("process/browser.js"),
    "net": require.resolve("net-browserify"),
    "tls": require.resolve("tls-browserify"),
    "querystring": false,
  };

  // Fix webpack dev server middleware deprecation warnings
  if (config.devServer) {
    config.devServer.setupMiddlewares = (middlewares, devServer) => {
      // Custom middlewares can be added here
      return middlewares;
    };
    // Remove deprecated options
    delete config.devServer.onAfterSetupMiddleware;
    delete config.devServer.onBeforeSetupMiddleware;
  }

  // Add plugins
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  // Add specific aliases for process/browser to handle ESM-related issues
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': 'process/browser.js',
  };

  config.ignoreWarnings = [/Failed to parse source map/];

  return config;
}; 