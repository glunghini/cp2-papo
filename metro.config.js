const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// O Firebase JS SDK publica alguns módulos como .cjs e se confunde com o campo
// "exports" do package.json no Metro. Sem isso o Auth falha com
// "Component auth has not been registered yet".
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
