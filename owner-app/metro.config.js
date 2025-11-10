const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require('metro-config/src/defaults/exclusionList');


const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg"],
  blockList: exclusionList([/node_modules\/@tybys\/wasm-util\/lib\/mjs\/.*/]),
};

module.exports = config;
