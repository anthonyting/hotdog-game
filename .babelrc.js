export default {
  "presets": [
    ["@babel/preset-react",
      {
        "flow": false,
        "typescript": true,
        "runtime": "automatic"
      },
    ],
    [
      "@babel/preset-typescript", {
        "isTSX": true,
        "allExtensions": true,
      }
    ],
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "entry",
        "corejs": "3.22"
      }
    ]
  ],
};