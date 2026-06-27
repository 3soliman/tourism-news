/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ['192.168.0.135'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'almohithotelsend-production.up.railway.app' }
    ]
  }
};

export default nextConfig;
