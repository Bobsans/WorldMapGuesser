const path = require('path');

const config = {
    root: path.resolve(__dirname, '..'),
    srcpath: path.resolve(__dirname, '../assets'),
    destpath: path.resolve(__dirname, '../static'),
    publicPath: '/static/',
    url: 'http://localhost:8300',

    // Development mode
    dev: {
        env: 'development',
        sourcemap: true,
        port: 8300,
        autoOpenBrowser: true
    },

    // Production mode
    prod: {
        env: 'production',
        sourcemap: false
    },

    get: (name, hasprod) => {
        hasprod = typeof hasprod !== 'undefined' ? hasprod : process.env.NODE_ENV === 'production';
        return hasprod ? config.prod[name] : config.dev[name];
    },
    depended: (conf, dev, prod, hasprod) => {
        hasprod = typeof hasprod !== 'undefined' ? hasprod : process.env.NODE_ENV === 'production';
        return !hasprod && config.dev[conf] ? dev : (hasprod && config.prod[conf] ? prod : false);
    }
};

module.exports = config;
