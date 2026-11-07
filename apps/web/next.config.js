/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/scene-compiler', '@repo/ui', '@repo/config', '@aether/ui', '@aether/twin-schema'],
  reactStrictMode: true,
};

module.exports = nextConfig;

