/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const OPERATION_MAP = {
    '$+': 'resolveAddition',
    '$-': 'resolveSubtraction',
    '$*': 'resolveMultiplication',
    '$/': 'resolveDivision',
    '$class': 'resolveClass',
    '$raw': 'resolveRaw',
    '$state': 'resolveState',
    '$now': 'resolveNow',
    '$currentMonth': 'resolveCurrentMonth',
    '$currentYear': 'resolveCurrentYear',
    '$nextMonth': 'resolveNextMonth',
    '$nextYear': 'resolveNextYear',
    '$previousMonth': 'resolvePreviousMonth',
    '$previousYear': 'resolvePreviousYear'
};
const PREPARATION_MAP = {
    '$join': 'prepareJoin',
    '$map': 'prepareMap',
    '$method': 'prepareMethod',
    '$model': 'prepareModel',
    '$moment': 'prepareMoment',
    '$round': 'prepareRound'
};
const Base = require('areto/base/Base');

module.exports = class CalcToken extends Base {

    static getOperation (key) {
        return OPERATION_MAP.hasOwnProperty(key) ? OPERATION_MAP[key] : null;
    }

    static getPreparation (key) {
        return PREPARATION_MAP.hasOwnProperty(key) ? PREPARATION_MAP[key] : null;
    }

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        this.resolve = Array.isArray(this.data)
            ? this.prepareResolvingMethod()
            : this.resolveStatic;
    }

    isStatic () {
        return this.resolve === this.resolveStatic;
    }

    prepareResolvingMethod () {
        const [type, ...operands] = this.data;
        const preparation = this.constructor.getPreparation(type);
        if (preparation) {
            return this[preparation](operands);
        }
        const operation = this.constructor.getOperation(type);
        if (!operation) {
            return this.resolveStatic;
        }
        this._operation = this[operation];
        this._operands = this.createOperands(operands);
        return this.resolveOperation;
    }

    createOperands (items) {
        return items.map(this.createOperand, this).filter(operand => operand);
    }

    createOperand () {
        return this.calc.createToken(...arguments);
    }

    executeMethod (name, value) {
        return value && typeof value[name] === 'function' ? value[name]() : value;
    }

    // PREPARE

    prepareJoin (items) {
        this._operation = this.resolveJoin;
        this._separator = items[0];
        this._operands = this.createOperands(items.slice(1));
        return this.resolveOperation;
    }

    prepareMap (items) {
        this._operation = this.resolveMap;
        this._method = this.executeMethod.bind(this, items[0]);
        this._operands = this.createOperands(items.slice(1));
        return this.resolveOperation;
    }

    prepareMethod (items) {
        this._operation = this.resolveMethod;
        this._method = items[0];
        this._operands = this.createOperands([items[1]]);
        this._arguments = items.slice(2);
        return this.resolveOperation;
    }

    prepareMoment (items) {
        this._operation = this.resolveMoment;
        this._operands = this.createOperands([items[0]]);
        this._method = items[1];
        this._arguments = items.slice(2);
        return this.resolveOperation;
    }

    prepareModel (items) {
        this._attrName = items[0];
        return this._attrName ? this.resolveModelValue : this.resolveModel;
    }

    prepareRound (items) {
        this._operation = this.resolveRound;
        this._operands = this.createOperands([items[0]]);
        this._precision = items[1];
        return this.resolveOperation;
    }

    // RESOLVE

    resolveStatic () {
        return this.data;
    }

    async resolveOperation (params) {
        const values = [];
        for (const operand of this._operands) {
            values.push(await operand.resolve(params));
        }
        return this._operation(values, params);
    }

    resolveAddition (values) {
        let result = Array.isArray(values[0]) ? this.resolveAddition(values[0]) : values[0];
        for (let i = 1; i < values.length; ++i) {
            result += (Array.isArray(values[i]) ? this.resolveAddition(values[i]) : values[i]) || 0;
        }
        return result;
    }

    resolveSubtraction (values) {
        let result = Array.isArray(values[0]) ? this.resolveSubtraction(values[0]) : values[0];
        for (let i = 1; i < values.length; ++i) {
            result -= (Array.isArray(values[i]) ? this.resolveSubtraction(values[i]) : values[i]) || 0;
        }
        return result;
    }

    resolveMultiplication (values) {
        let result = Array.isArray(values[0]) ? this.resolveMultiplication(values[0]) : values[0];
        for (let i = 1; i < values.length; ++i) {
            let value = Array.isArray(values[i]) ? this.resolveMultiplication(values[i]) : values[i];
            result *= value !== undefined ? value : 1;
        }
        return result;
    }

    resolveDivision (values) {
        let result = values[0];
        for (let i = 1; i < values.length; ++i) {
            result /= values[i];
        }
        return result;
    }

    resolveClass ([name], {view}) {
        const metaClass = view.meta.getClass(name);
        return metaClass ? metaClass.title : name;
    }

    resolveJoin (values) {
        return values.map(value => {
            return Array.isArray(value) ? value.join(this._separator) : value;
        }).join(this._separator);
    }

    resolveMap (values) {
        return [].concat(...values.map(value => {
            return Array.isArray(value) ? value.map(this._method) : this._method(value);
        }));
    }

    resolveMethod ([value]) {
        return value && typeof value[this._method] === 'function'
            ? value[this._method](...this._arguments)
            : value;
    }

    resolveModel ({model}) {
        return model instanceof Model ? model.getId() : this.data;
    }

    resolveModelValue ({model}) {
        return model instanceof Model ? model.get(this._attrName) : this.data;
    }

    resolveMoment ([value]) {
        if (!value) {
            return value;
        }
        value = moment(value);
        return typeof value[this._method] === 'function'
            ? value[this._method](...this._arguments)
            : value;
    }

    resolveRaw () {
        return this.data[1];
    }

    resolveRound ([value]) {
        return MathHelper.round(value, this._precision);
    }

    resolveState ([name], {view}) {
        const state = view.class.getState(name);
        return state ? state.title : name;
    }

    resolveNow () {
        return new Date;
    }

    resolveCurrentMonth () {
        const now = new Date;
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    resolveCurrentYear () {
        return new Date(new Date().getFullYear(), 0, 1);
    }

    resolveNextMonth () {
        const now = new Date;
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    resolveNextYear () {
        return new Date(new Date().getFullYear() + 1, 0, 1);
    }

    resolvePreviousMonth () {
        const now = new Date;
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    resolvePreviousYear () {
        return new Date(new Date().getFullYear() - 1, 0, 1);
    }

    log (type, message, data = this.data) {
        CommonHelper.log(this.calc, this.constructor.name, type, message, data);
    }
};

const moment = require('moment');
const CommonHelper = require('areto/helper/CommonHelper');
const MathHelper = require('areto/helper/MathHelper');
const Model = require('../model/Model');