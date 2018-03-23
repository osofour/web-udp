module.exports = {
  env: {
    test: {
      presets: [["@babel/preset-env"]],
      plugins: [
        "@babel/plugin-transform-modules-commonjs",
        "@babel/plugin-transform-flow-strip-types",
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-transform-runtime",
      ],
    },
    development: {
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              browsers: ["last 2 versions"],
            },
            modules: false,
          },
        ],
      ],
      plugins: [
        "@babel/plugin-transform-modules-commonjs",
        "@babel/plugin-transform-flow-strip-types",
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-object-rest-spread",
        [
          "@babel/plugin-transform-runtime",
          { helpers: false, polyfill: false },
        ],
      ],
      ignore: [/spec\.js$/],
    },
  },
}
