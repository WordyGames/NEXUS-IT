const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withExpoProjectDependency(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      return modConfig;
    }

    const dependencyLine = "    implementation project(':expo')";
    const contents = modConfig.modResults.contents;

    if (!contents.includes("implementation project(':expo')")) {
      modConfig.modResults.contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n${dependencyLine}`
      );
    }

    return modConfig;
  });
};
