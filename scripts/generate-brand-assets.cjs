const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const ROOT_DIR = path.resolve(__dirname, '..');

const ICON_INNER = `
  <rect width="420" height="420" rx="90" fill="#0F3D5E"/>
  <path
    d="M110 300 V120 L310 300 V120"
    stroke="white"
    stroke-width="24"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
`;

const ICON_SVG = `
<svg width="1024" height="1024" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
${ICON_INNER}
</svg>
`.trim();

const SPLASH_SVG = `
<svg width="1242" height="2436" viewBox="0 0 1242 2436" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="2436" fill="#0F3D5E" />
  <g transform="translate(311 908) scale(1.4761904762)">
${ICON_INNER}
  </g>
</svg>
`.trim();

const ensureDirForFile = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const writeTextFile = (relativePath, content) => {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  ensureDirForFile(absolutePath);
  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log(`Wrote ${relativePath}`);
};

const renderPngFromSvg = (svgContent, size, relativePath) => {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: size }
  });
  const pngBuffer = resvg.render().asPng();
  ensureDirForFile(absolutePath);
  fs.writeFileSync(absolutePath, pngBuffer);
  console.log(`Wrote ${relativePath} (${size}x${size})`);
};

const renderPngWithCustomSvg = (svgContent, width, height, relativePath) => {
  const absolutePath = path.join(ROOT_DIR, relativePath);
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: width }
  });
  const pngBuffer = resvg.render().asPng();
  ensureDirForFile(absolutePath);
  fs.writeFileSync(absolutePath, pngBuffer);
  console.log(`Wrote ${relativePath} (${width}x${height})`);
};

const generateIco = async (relativeOutputPath, sourceRelativePaths) => {
  const outputPath = path.join(ROOT_DIR, relativeOutputPath);
  const sourcePaths = sourceRelativePaths.map((p) => path.join(ROOT_DIR, p));
  const icoBuffer = await pngToIco(sourcePaths);
  ensureDirForFile(outputPath);
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`Wrote ${relativeOutputPath}`);
};

const writeBrandSvgs = () => {
  writeTextFile('apps/mobile/assets/logo.svg', `${ICON_SVG}\n`);
  writeTextFile('apps/desktop/public/logo.svg', `${ICON_SVG}\n`);
};

const generateMobileAssets = () => {
  renderPngFromSvg(ICON_SVG, 1024, 'apps/mobile/assets/icon.png');
  renderPngFromSvg(ICON_SVG, 1024, 'apps/mobile/assets/adaptive-icon.png');
  renderPngFromSvg(ICON_SVG, 64, 'apps/mobile/assets/favicon.png');
  renderPngWithCustomSvg(SPLASH_SVG, 1242, 2436, 'apps/mobile/assets/splash.png');

  const androidSizes = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 }
  ];

  for (const item of androidSizes) {
    renderPngFromSvg(
      ICON_SVG,
      item.size,
      `apps/mobile/assets/android-icons/${item.name}.png`
    );
  }

  const iosSizes = [
    { name: 'icon-20x20.png', size: 20 },
    { name: 'icon-29x29.png', size: 29 },
    { name: 'icon-40x40.png', size: 40 },
    { name: 'icon-60x60.png', size: 60 },
    { name: 'icon-76x76.png', size: 76 },
    { name: 'icon-83.5x83.5.png', size: 167 }
  ];

  for (const item of iosSizes) {
    renderPngFromSvg(
      ICON_SVG,
      item.size,
      `apps/mobile/assets/ios-icons/${item.name}`
    );
  }
};

const generateWebAssets = () => {
  renderPngFromSvg(ICON_SVG, 16, 'apps/desktop/public/favicon-16.png');
  renderPngFromSvg(ICON_SVG, 32, 'apps/desktop/public/favicon-32.png');
  renderPngFromSvg(ICON_SVG, 180, 'apps/desktop/public/apple-touch-icon.png');
  renderPngFromSvg(ICON_SVG, 192, 'apps/desktop/public/android-chrome-192.png');
  renderPngFromSvg(ICON_SVG, 512, 'apps/desktop/public/android-chrome-512.png');
};

const generateWindowsAssets = () => {
  renderPngFromSvg(ICON_SVG, 16, 'apps/desktop/assets/windows-icon-16.png');
  renderPngFromSvg(ICON_SVG, 32, 'apps/desktop/assets/windows-icon-32.png');
  renderPngFromSvg(ICON_SVG, 48, 'apps/desktop/assets/windows-icon-48.png');
  renderPngFromSvg(ICON_SVG, 256, 'apps/desktop/assets/windows-icon-256.png');
};

const run = async () => {
  writeBrandSvgs();
  generateMobileAssets();
  generateWebAssets();
  generateWindowsAssets();

  await generateIco('apps/desktop/assets/icon.ico', [
    'apps/desktop/assets/windows-icon-16.png',
    'apps/desktop/assets/windows-icon-32.png',
    'apps/desktop/assets/windows-icon-48.png',
    'apps/desktop/assets/windows-icon-256.png'
  ]);

  await generateIco('apps/desktop/assets/app.ico', [
    'apps/desktop/assets/windows-icon-16.png',
    'apps/desktop/assets/windows-icon-32.png',
    'apps/desktop/assets/windows-icon-48.png',
    'apps/desktop/assets/windows-icon-256.png'
  ]);

  await generateIco('apps/desktop/public/favicon.ico', [
    'apps/desktop/public/favicon-16.png',
    'apps/desktop/public/favicon-32.png'
  ]);

  await generateIco('apps/desktop/public/app.ico', [
    'apps/desktop/assets/windows-icon-16.png',
    'apps/desktop/assets/windows-icon-32.png',
    'apps/desktop/assets/windows-icon-48.png',
    'apps/desktop/assets/windows-icon-256.png'
  ]);
};

run().catch((error) => {
  console.error('Error generating brand assets:', error);
  process.exit(1);
});
