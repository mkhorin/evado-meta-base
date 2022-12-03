/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * ["$map", "prefix", ".values", "suffix"] - "prefix value1 suffix", "prefix value2 suffix", ...
 * ["$map", "$method", ".strings", "toUpperCase"]
 * ["$map", "$moment", ".dates", "format", "YY"]
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class MapHandler extends Base {

    init () {
        const handlerClass = this.owner.getHandlerClass(this.data[0]);
        if (!handlerClass) {
            return super.init();
        }
        const data = this.data.slice(1);
        this._handler = this.owner.createHandler(handlerClass, data, {each: true});
        this.resolve = this.resolveHandler;
    }

    resolveTokens (model) {
        let prefix = '';
        let suffix = '';
        let values = null;
        for (const token of this._tokens) {
            const data = token.resolve(model);
            if (values) {
                suffix += Array.isArray(data) ? data.join(', ') : data;
            } else if (Array.isArray(data)) {
                values = data;
            } else {
                prefix += data;
            }
        }
        if (!values) {
            return [];
        }
        const items = [];
        for (const value of values) {
            if (!CommonHelper.isEmpty(value)) {
                items.push(prefix + value + suffix);
            }
        }
        return items;
    }

    resolveHandler (model) {
        return this._handler.resolve(model);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');