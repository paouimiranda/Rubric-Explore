const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add this to exclude the functions folder
config.resolver.blockList = [
  /functions\/.*/,  // Ignore everything in functions folder
];

module.exports = config;