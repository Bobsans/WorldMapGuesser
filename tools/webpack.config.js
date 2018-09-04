const Webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJsWebpackPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const utils = require('./utils');
const config = require('./config');

module.exports = ({production} = {}) => {
    let configuration = {
        mode: production ? 'production' : 'development',
        cache: !production,
        devtool: config.depended('sourcemap', '#source-map', false),
        target: 'web',
        entry: {
            bundle: utils.srcpath('index.js')
        },
        output: {
            filename: '[name].js',
            path: utils.destpath(),
            chunkFilename: '[name].js',
            publicPath: config.publicPath
        },
        devServer: {
            contentBase: './static',
            hot: true
        },
        resolve: {
            extensions: ['.js', '.json', '.less'],
            alias: {
                '@': utils.srcpath(),
                '$variables': utils.srcpath('styles/variables.less')
            }
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            compact: production,
                            cacheDirectory: true
                        }
                    }
                }, {
                    test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                    use: {
                        loader: 'url-loader',
                        options: {
                            limit: 10240,
                            name: 'images/[hash:8].[ext]'
                        }
                    }
                }, {
                    test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                    use: {
                        loader: 'url-loader',
                        options: {
                            limit: 10240,
                            name: 'fonts/[hash:8].[ext]'
                        }
                    }
                },
                ...utils.styleLoaders({
                    sourcemap: config.get('sourcemap'),
                    production: production
                })
            ]
        },
        optimization: {
            namedChunks: true,
            runtimeChunk: {
                name: 'manifest'
            },
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    default: false,
                    vendors: {
                        name: 'vendor',
                        test: /[\\/]node_modules[\\/]/,
                        chunks: 'all'
                    },
                    styles: {
                        name: 'bundle',
                        test: /\.(s[ac]|le|c)ss$/,
                        chunks: 'all',
                        enforce: true
                    }
                }
            },
            minimize: production,
            minimizer: [
                new UglifyJsWebpackPlugin({
                    sourceMap: config.prod.sourcemap,
                    uglifyOptions: {
                        ecma: 8,
                        toplevel: true,
                        compress: {
                            warnings: false
                        },
                        output: {
                            comments: false,
                            beautify: false
                        },
                        mangle: {
                            toplevel: true
                        }
                    }
                }),
                new OptimizeCSSAssetsPlugin({
                    cssProcessor: require('cssnano'),
                    cssProcessorOptions: {
                        discardComments: {removeAll: true},
                        zindex: false
                    },
                    canPrint: true
                })
            ]
        },
        plugins: [
            new Webpack.DefinePlugin({
                PRODUCTION: JSON.stringify(production)
            }),
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[id].css'
            }),
            ...(production ? [
                new CleanWebpackPlugin([config.destpath], {root: config.root, verbose: false})
            ] : [
                new Webpack.HotModuleReplacementPlugin(),
                new FriendlyErrorsPlugin()
            ])
        ]
    };

    if (!production) {
        Object.keys(configuration.entry).forEach((name) => {
            configuration.entry[name] = ['./tools/dev-client'].concat(configuration.entry[name]);
        });
    }

    return configuration;
};
