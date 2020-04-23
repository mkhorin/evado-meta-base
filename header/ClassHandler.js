/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class ClassHandler extends Base {

    init () {
        super.init();
        if (!this._token) {
            return this.log('error', `Invalid data`);
        }
        const attr = this._token.getLastAttr();
        if (!attr) {
            return this.log('error', `Attribute not found`);
        }
    }

    resolveToken (model) {
        const name = this._token.resolve(model);
        const metaClass = model.class.meta.getClass(name);
        return metaClass ? metaClass.title : name;
    }
};