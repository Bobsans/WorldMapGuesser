// process.env.NODE_ENV = 'production';

const Webpack = require('webpack');
const Chalk = require('chalk');

const webpackConfig = require('./webpack.config')({production: true});

Webpack(webpackConfig, (err, stats) => {
    if (err) {
        throw err;
    }

    process.stdout.write(stats.toString(webpackConfig.stats) + '\n\n');

    if (stats.hasErrors()) {
        console.log(Chalk.red('  Build failed with errors.\n'));
        process.exit(1);
    }

    console.log(Chalk.cyan('  Build complete.\n'));
});
