/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class MethodHandler extends Base {

    init () {
        this._token = this.createToken(this.data.shift());
        this._method = this.data.shift();
        this._arguments = this.data;
    }

    resolve (model) {
        if (!this._token) {
            return null;
        }
        const value = this._token.resolve(model);
        if (value === null || value === undefined) {
            return value;
        }
        if (this.each) {
            return this.resolveEach(value, model);
        }
        return typeof value[this._method] === 'function'
            ? value[this._method](...this._arguments)
            : value;
    }

    resolveEach (values) {
        values = Array.isArray(values) ? values : [values];
        const result = [];
        for (const value of values) {
            if (value !== null && value !== undefined) {
                result.push(typeof value[this._method] === 'function'
                    ? value[this._method](...this._arguments)
                    : value);
            }
        }
        return result;
    }
};