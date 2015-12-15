'use strict';

var path = require('path');
var webpack = require('webpack');
var Manifest = require('manifest-revision-webpack-plugin');
var TextPlugin = require('extract-text-webpack-plugin');
var HtmlPlugin = require('html-webpack-plugin-extra-files');
var jsonPresent = require('./helpers/json-presenter');

module.exports = function(_path) {
    var appPath = path.join(_path, 'app'),
        assetsPath = path.join(appPath, 'assets'),
        relAssetsPath = path.relative('.', assetsPath);

    var aliases = {
        _app: appPath,
        _data: path.join(appPath, 'data'),
        _assets: assetsPath,
        _images: path.join(assetsPath, 'images'),
        _svg: path.join(assetsPath, 'svg'),
        _fonts: path.join(assetsPath, 'fonts'),
        _asset_layouts: path.join(assetsPath, 'templates', 'layouts'),
        _bower: path.join(_path, 'bower_components'),
    };

    var dependencies = Object.keys(require(_path + '/package').dependencies);

    return {
        entry: {
            application: path.join(aliases._app, 'app.js'),
            vendors: dependencies,
        },
        output: {
            path: path.join(_path, 'dist'),
            filename: path.join('assets', 'js', '[name].bundle.[chunkhash].js'),
            chunkFilename: '[id].bundle.[chunkhash].js',
            publicPath: '',
        },
        resolve: {
            extensions: ['', '.js', '.styl', '.jade'],
            modulesDirectories: ['node_modules'],
            alias: aliases,
        },
        module: {
            loaders: [{
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: "babel-loader",
                query: {
                  presets: ['es2015'],
                },
            }, {
                test: /\.tsv$/i,
                loader: 'file?context=' + appPath + '&name=[path][name].[hash].[ext]',
            }, {
                test: /\.xml$/,
                loader: 'xml-loader',
            }, {
                test: /\.json$/,
                loader: 'json-loader',
            }, {
                test: /\.jade$/,
                loader: 'jade-loader',
            }, {
                test: /\.(png|ico|jpg|jpeg|gif|svg)(\?\w+)?$/i,
                loader: 'file?context=' + relAssetsPath + '&name=[path][name].[hash].[ext]',
            }, {
                test: /\.(ttf|eot|woff|woff2)(\?\w+)?$/i,
                loader: 'file?context=' + relAssetsPath + '&name=[path][name].[hash].[ext]',
            }, {
                test: /\.css$/,
                loader: TextPlugin.extract(
                    'style-loader',
                    'css-loader!autoprefixer-loader',
                    {
                        publicPath: "../../"
                    }
                ),
            }, {
                test: /\.styl$/,
                loader: TextPlugin.extract(
                    'style-loader',
                    'css-loader!autoprefixer-loader!stylus-loader',
                    {
                        publicPath: "../../"
                    }
                ),
            }, {
                test: /\.scss$/,
                loader: TextPlugin.extract(
                    'style-loader',
                    'css-loader!autoprefixer-loader!sass-loader',
                    {
                        publicPath: "../../"
                    }
                ),
            }, {
                test: /\.less$/,
                loader: TextPlugin.extract(
                    'style-loader',
                    'css-loader!autoprefixer-loader!less-loader',
                    {
                        publicPath: "../../"
                    }
                ),
            }, ],
        },
        plugins: [
            new webpack.DefinePlugin({
                TYPE_ENV: JSON.stringify(process.env.TYPE_ENV),
                NODE_ENV: JSON.stringify(process.env.NODE_ENV),
            }),
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                d3: 'd3',
                _: 'underscore',
                path: 'path',
                URL: 'url'
            }),
            new webpack.optimize.CommonsChunkPlugin('vendors', 'assets/js/vendors.[chunkhash].js'),
            new TextPlugin('assets/css/[name].[chunkhash].css'),
            new Manifest(path.join(_path, 'config', 'manifest.json'), {
                rootAssetPath: relAssetsPath,
                ignorePaths: ['/templates'],
                format: jsonPresent,
            }),
            new HtmlPlugin({
                title: 'Война и Мир',
                chunks: ['vendors', 'application'],
                filename: 'index.html',
                extraFiles: [],
                template: path.join(aliases._asset_layouts, 'index.html'),
            }),
            new webpack.optimize.UglifyJsPlugin(),
        ],
    };
};