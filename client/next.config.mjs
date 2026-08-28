/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' }
    ],
    unoptimized: true
  }
};

export default nextConfig;
