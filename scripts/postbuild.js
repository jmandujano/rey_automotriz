/**
 * postbuild.js
 *
 * Workaround for a Next.js 15 bug in standalone output mode where
 * the build fails to copy page_client-reference-manifest.js for
 * route group segments like (admin)/page. Route groups are
 * transparent (no URL segment), so Next.js generates the manifest
 * at the parent level (/page) but tries to copy it from the
 * route-group directory ((admin)/page), which doesn't exist.
 *
 * At runtime, the missing manifest causes:
 *   InvariantError: Expected clientReferenceManifest to be defined
 *
 * Fix: For each route-group directory in .next/server/app that has
 * a page.js but no page_client-reference-manifest.js, generate a
 * minimal manifest file in both .next/server/app and
 * .next/standalone/.next/server/app.
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const serverAppDir = path.join(nextDir, 'server', 'app');
const standaloneAppDir = path.join(nextDir, 'standalone', '.next', 'server', 'app');

/**
 * Check if a directory name is a Next.js route group (wrapped in parens).
 */
function isRouteGroup(name) {
  return name.startsWith('(') && name.endsWith(')');
}

/**
 * Build the RSC page key for a route group directory.
 * Route groups are transparent, so (admin)/page -> /(admin)/page key.
 */
function buildPageKey(relativePath) {
  return '/' + relativePath.replace(/\\/g, '/') + '/page';
}

/**
 * Generate a minimal client-reference-manifest JS file.
 * The manifest must set globalThis.__RSC_MANIFEST[key] = {...}
 * An empty ssrModuleMapping and edgeSSRModuleMapping is valid for
 * pages that are pure server-side (no client references of their own).
 */
function generateManifest(pageKey) {
  return `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST[${JSON.stringify(pageKey)}]={"moduleLoading":{"prefix":"/_next/"},"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{}};`;
}

function processDir(dir, standaloneDir, relativePath) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isRouteGroup(entry.name)) continue;

    const subDir = path.join(dir, entry.name);
    const standaloneSubDir = path.join(standaloneDir, entry.name);
    const subRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    const pageJs = path.join(subDir, 'page.js');
    const manifest = path.join(subDir, 'page_client-reference-manifest.js');
    const standaloneManifest = path.join(standaloneSubDir, 'page_client-reference-manifest.js');

    if (fs.existsSync(pageJs) && !fs.existsSync(manifest)) {
      const pageKey = buildPageKey(subRelative);
      const content = generateManifest(pageKey);

      // Write to .next/server/app/(group)/
      fs.writeFileSync(manifest, content);
      console.log(`Generated manifest: .next/server/app/${subRelative}/page_client-reference-manifest.js (key: ${pageKey})`);

      // Write to standalone dir if it exists
      if (fs.existsSync(standaloneDir)) {
        fs.mkdirSync(standaloneSubDir, { recursive: true });
        fs.writeFileSync(standaloneManifest, content);
        console.log(`Copied to standalone: .next/standalone/.next/server/app/${subRelative}/page_client-reference-manifest.js`);
      }
    }

    // Recurse into nested route groups
    processDir(subDir, standaloneSubDir, subRelative);
  }
}

processDir(serverAppDir, standaloneAppDir, '');
console.log('Post-build manifest fix complete.');
