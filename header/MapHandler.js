/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
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
        let targets = null;
        for (const token of this._tokens) {
            const data = token.resolve(model);
            if (targets) {
                suffix += Array.isArray(data) ? data.join(', ') : data;
            } else if (Array.isArray(data)) {
                targets = data;
            } else {
                prefix += data;
            }
        }
        return targets
            ? targets.map(target => prefix + target + suffix)
            : [];
    }

    resolveHandler (model) {
        return this._handler.resolve(model);
    }
};