import {
  CleanWebpackPlugin
} from 'clean-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import {
  fileURLToPath
} from 'url';
import webpack from 'webpack';

const __filename = fileURLToPath(
  import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
/** @type {import("webpack").Configuration} */
const browserConfig = {
  entry: path.resolve(__dirname, "./src/ts/index.tsx"),
  mode: isDev ? 'development' : 'production',
  devtool: isDev ? "inline-source-map" : false,
  output: {
    path: path.resolve(__dirname, "./dist/static")
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  module: {
    rules: [{
      test: /\.d?tsx?/,
      loader: "babel-loader",
      exclude: /node_modules/,
    }, {
      test: /\.(svg|jpg)/,
      type: 'asset/resource',
      exclude: /node_modules/,
    }, {
      test: /\.css$/i,
      use: [MiniCssExtractPlugin.loader, 'css-loader'],
    }]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      favicon: path.resolve(__dirname, "./src/ts/assets/images/favicon.ico"),
      template: 'src/html/index.html',
    }),
    new webpack.DefinePlugin({
      USE_MULTIPLAYER: false,
    }),
    new MiniCssExtractPlugin(),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  }
};

export default [browserConfig];