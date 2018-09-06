const opn = require('opn');
const express = require('express');
const webpack = require('webpack');
const HttpProxyMiddleware = require('http-proxy-middleware');
const WebpackDevMiddleware = require('webpack-dev-middleware');
const WebpackHotMiddleware = require('webpack-hot-middleware');

const config = require('./config');
const webpackConfig = require('./webpack.config')({production: false});

const port = process.env.PORT || config.dev.port;

let app = express();
let compiler = webpack(webpackConfig);

let devMiddleware = WebpackDevMiddleware(compiler, {
    logLevel: 'warn',
    logTime: true,
    publicPath: webpackConfig.output.publicPath,
    watchOptions: {
        aggregateTimeout: 500,
        ignored: /node_modules/,
        poll: true
    }
});

let hotMiddleware = WebpackHotMiddleware(compiler, {
    log: false,
    path: '/__webpack_hmr',
    heartbeat: 10000
});

config.dev.proxyTable.forEach((proxy) => app.use(HttpProxyMiddleware(...proxy)));

app.use(devMiddleware);
app.use(hotMiddleware);
app.use(webpackConfig.output.publicPath, express.static('./static'));

let server = app.listen(port, () => {
    console.log('> Starting dev server...\n');

    devMiddleware.waitUntilValid(() => {
        console.log('> Listening at ' + config.url + '\n');

        if (config.dev.autoOpenBrowser) {
            opn(config.url);
        }
    });
});

module.exports = {
    close: () => server.close()
};
