/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class BaseHandler extends Base {

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        const tokens = this.createTokens(this.data);
        if (tokens.length === 1) {
            this.resolve = this.resolveToken;
            this._token = tokens[0];
        } else if (tokens.length > 1) {
            this.resolve = this.resolveTokens;
        }
        this._tokens = tokens;
    }

    createTokens () {
        return this.data.map(this.createToken, this).filter(v => !!v);
    }

    createToken (data) {
        return this.owner.constructor.create(data, this.owner.header);
    }

    resolve () {
        return null;
    }

    resolveToken (model) {
        return this._token.resolve(model);
    }

    resolveTokens (model) {
        let result = '';
        for (const token of this._tokens) {
            const data = token.resolve(model);
            result += Array.isArray(data) ? data.join(', ') : data;
        }
        return result;
    }

    log (type, message, data) {
        this.owner.log(type, this.wrapClassMessage(message), data);
    }
};