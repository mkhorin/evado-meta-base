/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class CalcToken extends Base {

    static getMethod (operator) {
        const methods = this.prototype;
        switch (operator) {
            case '$out': return methods.resolveOut;
            case '$+': return methods.resolveAddition;
            case '$-': return methods.resolveSubtraction;
            case '$*': return methods.resolveMultiplication;
            case '$/': return methods.resolveDivision;
            case '$class': return methods.resolveClass;
            case '$join': return methods.resolveJoin;
            case '$map': return methods.resolveMap;
            case '$method': return methods.resolveMethod;
            case '$moment': return methods.resolveMoment;
            case '$now': return methods.resolveNow;
            case '$round': return methods.resolveRound;
            case '$state': return methods.resolveState;
            case '$user': return methods.resolveUser;
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
        let result = Array.isArray(values[0])
            ? this.resolveAddition(model, ...values[0])
            : values[0];
        for (let i = 1; i < values.length; ++i) {
            result += Array.isArray(values[i])
                ? this.resolveAddition(model, ...values[i])
                : values[i];
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
        let result = Array.isArray(values[0])
            ? this.resolveMultiplication(model, ...values[0])
            : values[0];
        for (let i = 1; i < values.length; ++i) {
            result *= Array.isArray(values[i])
                ? this.resolveMultiplication(model, ...values[i])
                : values[i];
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

    resolveClass (model, name) {
        const metaClass = model.class.meta.getClass(name);
        return metaClass ? metaClass.title : name;
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

    executeMapMethod (name, value) {
        return value && typeof value[name] === 'function' ? value[name]() : value;
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

    resolveRound (model, value, precision) {
        return MathHelper.round(value, precision);
    }

    resolveState (model, name) {
        const state = model.class.getState(name);
        return state ? state.title : name;
    }

    resolveUser (model) {
        return model.user.getId();
    }

    log () {
        CommonHelper.log(this.calc, this.constructor.name, ...arguments);
    }
};

const moment = require('moment');
const CommonHelper = require('areto/helper/CommonHelper');
const MathHelper = require('areto/helper/MathHelper');