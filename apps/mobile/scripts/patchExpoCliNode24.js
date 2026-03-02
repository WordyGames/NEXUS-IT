const fs = require('fs');
const path = require('path');

const expoCliTargetFile = path.resolve(
  __dirname,
  '../../../node_modules/@expo/cli/build/src/start/server/metro/externals.js'
);

const expoCliPatchMarker = 'moduleId.replace(/^node:/';
const expoCliNeedle = 'const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);';
const expoCliReplacement = [
  'const safeModuleId = moduleId.replace(/^node:/, "");',
  '        const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, safeModuleId);'
].join('\n');

const metroConfigTargetFile = path.resolve(
  __dirname,
  '../../../node_modules/@expo/metro-config/build/serializer/exportHermes.js'
);

const metroConfigPatchMarker = "const reactNativePkgPath = require.resolve('react-native/package.json', { paths: [process.cwd()] });";
const metroConfigNeedle = [
  '    for (const location of hermescLocations) {',
  '        try {',
  '            return require.resolve(location);',
  '        }',
  '        catch { }',
  '    }',
  "    throw new Error('Cannot find the hermesc executable.');"
].join('\n');
const metroConfigLegacyNeedle = [
  '    for (const location of hermescLocations) {',
  '        try {',
  '            return require.resolve(location);',
  '        }',
  '        catch { }',
  '    }',
  '    try {',
  "        const reactNativePkgPath = require.resolve('react-native/package.json');",
  "        const hermesFromReactNative = path_1.default.join(path_1.default.dirname(reactNativePkgPath), 'sdks', 'hermesc', platformExecutable);",
  '        if (fs_extra_1.default.existsSync(hermesFromReactNative)) {',
  '            return hermesFromReactNative;',
  '        }',
  '    }',
  '    catch { }',
  '    try {',
  "        const hermesEnginePkgPath = require.resolve('hermes-engine/package.json');",
  "        const hermesFromEngine = path_1.default.join(path_1.default.dirname(hermesEnginePkgPath), platformExecutable);",
  '        if (fs_extra_1.default.existsSync(hermesFromEngine)) {',
  '            return hermesFromEngine;',
  '        }',
  '    }',
  '    catch { }',
  "    throw new Error('Cannot find the hermesc executable.');"
].join('\n');
const metroConfigReplacement = [
  '    for (const location of hermescLocations) {',
  '        try {',
  '            return require.resolve(location);',
  '        }',
  '        catch { }',
  '    }',
  '    try {',
  "        const reactNativePkgPath = require.resolve('react-native/package.json', { paths: [process.cwd()] });",
  "        const hermesFromReactNative = path_1.default.join(path_1.default.dirname(reactNativePkgPath), 'sdks', 'hermesc', platformExecutable);",
  '        if (fs_extra_1.default.existsSync(hermesFromReactNative)) {',
  '            return hermesFromReactNative;',
  '        }',
  '    }',
  '    catch { }',
  '    try {',
  "        const reactNativePkgPath = require.resolve('react-native/package.json');",
  "        const hermesFromReactNative = path_1.default.join(path_1.default.dirname(reactNativePkgPath), 'sdks', 'hermesc', platformExecutable);",
  '        if (fs_extra_1.default.existsSync(hermesFromReactNative)) {',
  '            return hermesFromReactNative;',
  '        }',
  '    }',
  '    catch { }',
  '    try {',
  "        const hermesEnginePkgPath = require.resolve('hermes-engine/package.json');",
  "        const hermesFromEngine = path_1.default.join(path_1.default.dirname(hermesEnginePkgPath), platformExecutable);",
  '        if (fs_extra_1.default.existsSync(hermesFromEngine)) {',
  '            return hermesFromEngine;',
  '        }',
  '    }',
  '    catch { }',
  "    throw new Error('Cannot find the hermesc executable.');"
].join('\n');

const patchFile = ({
  targetFile,
  patchMarker,
  needle,
  legacyNeedle,
  replacement,
  label
}) => {
  if (!fs.existsSync(targetFile)) {
    console.log(`[patch-expo-cli-node24] ${label}: archivo no encontrado, omitiendo.`);
    return;
  }

  const source = fs.readFileSync(targetFile, 'utf8');

  if (source.includes(patchMarker)) {
    console.log(`[patch-expo-cli-node24] ${label}: parche ya aplicado.`);
    return;
  }

  const activeNeedle = source.includes(needle)
    ? needle
    : source.includes(legacyNeedle)
      ? legacyNeedle
      : null;

  if (!activeNeedle) {
    console.log(`[patch-expo-cli-node24] ${label}: bloque esperado no encontrado, omitiendo.`);
    return;
  }

  const patched = source.replace(activeNeedle, replacement);
  fs.writeFileSync(targetFile, patched, 'utf8');
  console.log(`[patch-expo-cli-node24] ${label}: parche aplicado.`);
};

try {
  patchFile({
    targetFile: expoCliTargetFile,
    patchMarker: expoCliPatchMarker,
    needle: expoCliNeedle,
    replacement: expoCliReplacement,
    label: '@expo/cli externals'
  });

  patchFile({
    targetFile: metroConfigTargetFile,
    patchMarker: metroConfigPatchMarker,
    needle: metroConfigNeedle,
    legacyNeedle: metroConfigLegacyNeedle,
    replacement: metroConfigReplacement,
    label: '@expo/metro-config hermesc'
  });
} catch (error) {
  console.warn('[patch-expo-cli-node24] No se pudo aplicar el parche:', error);
}
