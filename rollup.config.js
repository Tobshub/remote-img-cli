const esbuild = require("rollup-plugin-esbuild").default;
const commonjs = require("@rollup/plugin-commonjs").default;
const packageJson = require("./package.json");

const name = packageJson.main.replace(/\.js$/, "");

const bundle = (config) => ({
  ...config,
  input: "./src/index.ts",
  external: (id) => !/^[./]/.test(id),
});

module.exports = [
  bundle({
    plugins: [
      esbuild({ minify: true }),
      commonjs({ esmExternals: true, requireReturnsDefault: true }),
    ],
    output: [
      {
        file: `${name}.js`,
        format: "cjs",
        sourcemap: false,
        exports: "named",
      },
    ],
  }),
];
