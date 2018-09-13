const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const extend = require('deep-extend');
const stripAnsi = require('strip-ansi');
const Entrypoint = require('webpack/lib/Entrypoint');

let DEFAULT_OUTPUT_FILENAME = 'statics.json';
let DEFAULT_LOG_TIME = false;

class PluginIntegration {
    constructor(options) {
        this.contents = {};
        this.options = options || {};
        this.options.filename = this.options.filename || DEFAULT_OUTPUT_FILENAME;
        this.options.logTime = this.options.logTime === undefined ? DEFAULT_LOG_TIME : this.options.logTime;
    }

    apply(compiler) {
        let plugin = {name: 'PluginIntegration'};

        compiler.hooks.compilation.tap(plugin, (compilation) => {
            compilation.hooks.failedModule.tap(plugin, (fail) => {
                let output = {
                    status: 'error',
                    error: fail.error.name || 'unknown-error'
                };

                if (fail.error.module !== undefined) {
                    output.file = fail.error.module.userRequest;
                }

                output.message = fail.error.error !== undefined ? stripAnsi(fail.error.error.codeFrame) : '';
                this.writeOutput(compiler, output);
            });
        });

        compiler.hooks.compile.tap(plugin, () => {
            this.writeOutput(compiler, {status: 'compiling'});
        });

        compiler.hooks.done.tap(plugin, (stats) => {
            let publicPath = this.options.publicPath || compiler.options.output.publicPath;

            let output = {
                status: 'done',
                ...(this.options.logTime ? {startTime: stats.startTime, endTime: stats.endTime} : {}),
                ...(publicPath ? {publicPath} : {}),
                bundles: {}
            };

            stats.compilation.chunkGroups.filter((group) => group instanceof Entrypoint).map((entry) => {
                output.bundles[entry.options.name] = entry.chunks.map((chunk) => {
                    return chunk.files.map((file) => {
                        return {
                            name: chunk.name,
                            filename: file,
                            ...(publicPath ? {publicPath: `${publicPath}${file}`} : {}),
                            ...(compiler.options.output.path ? {path: path.join(compiler.options.output.path, file)} : {})
                        }
                    });
                }).reduce((a, c) => [...a, ...c], []);
            });

            this.writeOutput(compiler, output);
        });
    }

    writeOutput(compiler, contents) {
        let outputFilename = path.join(this.options.path || '.', this.options.filename);

        mkdirp.sync(path.dirname(outputFilename));

        this.contents = extend(this.contents, contents);

        fs.writeFileSync(outputFilename, JSON.stringify(this.contents, null, this.options.indent));
    }
}

module.exports = PluginIntegration;
