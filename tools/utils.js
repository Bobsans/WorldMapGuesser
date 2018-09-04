const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const config = require('./config');

const utils = {
    srcpath: (part) => part ? path.resolve(config.srcpath, part) : config.srcpath,
    destpath: (part) => part ? path.resolve(config.destpath, part) : config.destpath,
    styleLoaders: ({sourcemap, production} = {}) => {
        function generateLoader(extension, loaders = []) {
            return {
                test: new RegExp(`\\.${extension}$`),
                use: [
                    production ? MiniCssExtractPlugin.loader : 'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: sourcemap
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: sourcemap,
                            plugins: () => [require('autoprefixer')()]
                        }
                    },
                    ...loaders.map(({loader, options = {}}) => ({
                        loader: loader,
                        options: {
                            sourceMap: sourcemap,
                            ...options
                        }
                    }))
                ]
            };
        }

        return [
            generateLoader('css'),
            generateLoader('less', [
                {loader: path.resolve(__dirname, 'plugins/loader-less-path-fixer.js'), options: {separator: '@', root: config.srcpath}},
                {loader: 'less-loader'}
            ])
        ];
    }
};

module.exports = utils;
