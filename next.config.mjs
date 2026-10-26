/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Africa/Kampala is enforced in the app layer (date-fns-tz); the server clock
  // is treated as UTC and never read for local time.
};

export default nextConfig;
