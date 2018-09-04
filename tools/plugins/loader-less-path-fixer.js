const path = require('path');
const loaderUtils = require('loader-utils');
const Tokenizer = require('css-selector-tokenizer');
const postcss = require('postcss');


const PREFIX = '___LESS_URL_FIXER_LOADER_URL___';

module.exports = function(content, map) {
    const query = loaderUtils.getOptions(this) || {};

    let sourceMap = query.sourceMap || false;
    let root = query.root || '';
    let rootSymbol = '@';

    let callback = this.async();

    let from = loaderUtils.getRemainingRequest(this).split('!').pop();
    let to = loaderUtils.getCurrentRequest(this).split('!').pop();

    let urls = [];

    function processNode(node) {
        switch (node.type) {
            case 'value':
            case 'nested-item':
                node.nodes.forEach(processNode);
                break;
            case 'url':
                if (node.url.replace(/\s/g, '').length && !/^#/.test(node.url) && loaderUtils.isUrlRequest(node.url)) {
                    node.stringType = '';
                    delete node.innerSpacingBefore;
                    delete node.innerSpacingAfter;
                    let url = node.url;
                    node.url = `${PREFIX}${urls.length}___`;
                    urls.push(url);
                }
                break;
        }
    }

    postcss([postcss.plugin('less-path-fixer-parser', () => (css) => {
        css.walkDecls((decl) => {
            let values = Tokenizer.parseValues(decl.value);
            values.nodes.forEach((value) => value.nodes.forEach(processNode));
            decl.value = Tokenizer.stringifyValues(values);
        });
    })()]).process(content, {
        from: '/loader-less-path-fixer!' + from,
        to: to,
        map: sourceMap ? {
            prev: map,
            sourcesContent: true,
            inline: false,
            annotation: false
        } : null
    }).then((result) => {
        callback(null, result.css.replace(new RegExp(`${PREFIX}([0-9]+)___`, 'g'), (item, x) => {
            let relative = path.relative(root, path.dirname(from)).replace(/\\/g, '/').split('/').map(() => '..').join('/');
            return path.join(relative, urls[x].split(rootSymbol).pop()).replace(/\\/g, '/');
        }));
    }).catch((err) => {
        callback(err);
    });
};
