/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class CalcToken extends Base {

    static getMethod (operator) {
        switch (operator) {
            case '$out': return this.prototype.resolveOut;
            case '$+': return this.prototype.resolveAddition;
            case '$-': return this.prototype.resolveSubtraction;
            case '$*': return this.prototype.resolveMultiplication;
            case '$/': return this.prototype.resolveDivision;
            case '$join': return this.prototype.resolveJoin;
            case '$map': return this.prototype.resolveMap;
            case '$method': return this.prototype.resolveMethod;
            case '$moment': return this.prototype.resolveMoment;
            case '$now': return this.prototype.resolveNow;
            case '$user': return this.prototype.resolveUser;
        }
    }

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        this.method = this.constructor.getMethod(this.operator);
        this.operands = this.operands.map(this.createOperand, this);
    }

    createOperand (data) {
        return this.calc.createOperand(data);
    }

    async resolve (model) {
        const values = [];
        for (const operand of this.operands) {
            values.push(await operand.resolve(model));
        }
        return this.method(model, ...values);
    }

    resolveOut (model, value) {
        return value;
    }

    resolveAddition (model, ...values) {
        let result = values[0];
        for (let i = 1; i < values.length; ++i) {
            result += values[i];
        }
        return result;
    }

    resolveSubtraction (model, ...values) {
        let result = values[0];
        for (let i = 1; i < values.length; ++i) {
            result -= values[i];
        }
        return result;
    }

    resolveMultiplication (model, ...values) {
        let result = values[0];
        for (let i = 1; i < values.length; ++i) {
            result *= values[i];
        }
        return result;
    }

    resolveDivision (model, ...values) {
        let result = values[0];
        for (let i = 1; i < values.length; ++i) {
            result /= values[i];
        }
        return result;
    }

    resolveJoin (model, separator, ...values) {
        return values.map(value => {
            return Array.isArray(value) ? value.join(separator) : value;
        }).join(separator);
    }

    resolveMap (model, method, ...values) {
        method = this.executeMapMethod.bind(this, model, method);
        return [].concat(...values.map(data => Array.isArray(data) ? data.map(method) : value));
    }

    resolveMethod (model, value, method, ...args) {
        return value && typeof value[method] === 'function' ? value[method](...args) : value;
    }

    resolveMoment (model, value, ...args) {
        return value ? this.resolveMethod(model, moment(value), ...args) : value;
    }

    resolveNow () {
        return new Date;
    }

    resolveUser (model) {
        return model.user.getId();
    }

    executeMapMethod (name, value) {
        return value && typeof value[name] === 'function' ? value[name]() : value;
    }

    log () {
        CommonHelper.log(this.calc, this.constructor.name, ...arguments);
    }
};

const moment = require('moment');
const CommonHelper = require('areto/helper/CommonHelper');