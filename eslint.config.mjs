import next from "eslint-config-next";

// eslint-config-next 16 ships a ready flat config (core-web-vitals + typescript).
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "lib/db/migrations/**",
      "next-env.d.ts",
    ],
  },
  ...(Array.isArray(next) ? next : [next]),
];

export default eslintConfig;
