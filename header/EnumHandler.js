/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class EnumHandler extends Base {

    init () {
        super.init();
        if (!this._token) {
            return this.log('error', `Invalid data`);
        }
        const lastAttr = this._token.getLastAttr();
        if (!lastAttr) {
            return this.log('error', `Attribute not found`);
        }
        this._enum = lastAttr.enum;
        if (!this._enum) {
            return this.log('error', `Enum not found`);
        }
    }

    resolveToken (model) {
        const value = this._token.resolve(model);
        return this._enum ? this._enum.getText(value) : value;
    }
};