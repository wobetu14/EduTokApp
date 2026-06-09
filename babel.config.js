module.exports = function (api) {
  api.cache(true);
  // In Jest, disable the Reanimated Babel plugin (requires react-native-worklets which is
  // unavailable in Node.js/Jest). babel-preset-expo supports a `reanimated` option for this.
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [['babel-preset-expo', { reanimated: !isTest }]],
  };
};
