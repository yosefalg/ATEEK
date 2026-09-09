const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const currentMinifierConfig = config.transformer.minifierConfig || {};
const currentCompress = currentMinifierConfig.compress || {};

config.transformer.minifierConfig = {
  ...currentMinifierConfig,
  compress: {
    ...currentCompress,
    drop_console: true,
  },
};

module.exports = config;
