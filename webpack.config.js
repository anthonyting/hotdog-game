import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

// eslint-disable-next-line no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';
/** @type {import("webpack").Configuration} */
const browserConfig = {
  entry: path.resolve(__dirname, './src/ts/index.tsx'),
  mode: isDev ? 'development' : 'production',
  devtool: isDev ? 'inline-source-map' : false,
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, './dist/static'),
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.d?tsx?/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(svg|jpg)/,
        type: 'asset/resource',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: path.resolve(__dirname, './src/ts/assets/images/favicon.ico'),
      template: 'src/html/index.html',
    }),
    new webpack.DefinePlugin({
      USE_MULTIPLAYER: false,
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};

export default [browserConfig];
