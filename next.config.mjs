/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdfjs-dist'],
  outputFileTracingIncludes: {
    '/api/extract-text': [
      './node_modules/pdfjs-dist/legacy/build/*.mjs',
      './node_modules/pdfjs-dist/standard_fonts/*',
    ],
  },
}

export default nextConfig
