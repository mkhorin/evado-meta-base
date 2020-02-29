/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class MomentHandler extends Base {

    init () {
        this._token = this.createToken(this.data.shift());
        this._method = this.data.shift();
        this._arguments = this.data;
    }

    resolve (model) {
        if (!this._token) {
            return null;
        }
        let value = this._token.resolve(model);
        if (!value) {
            return value;
        }
        return Array.isArray(value)
            ? this.resolveEach(value, model)
            : this.resolveOne(value, model);
    }

    resolveEach (values, model) {
        const result = [];
        for (let value of values) {
            result.push(value ? this.resolveOne(value, model) : value);
        }
        return result;
    }

    resolveOne (value, model) {
        value = moment(value).locale(model.controller.language);
        return typeof value[this._method] === 'function'
            ? value[this._method](...this._arguments)
            : value;
    }
};

const moment = require('moment');