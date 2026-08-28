/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' }
    ],
    unoptimized: true
  }
};

export default nextConfig;
