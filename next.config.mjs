/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the dev-only route indicator; it sat on top of the sidebar's Sign out.
  // Compile and runtime errors still surface.
  devIndicators: false,
  // Africa/Kampala is enforced in the app layer (date-fns-tz); the server clock
  // is treated as UTC and never read for local time.
};

export default nextConfig;
