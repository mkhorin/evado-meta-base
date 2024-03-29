/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const OPERATION_MAP = {
    '$+': 'resolveAddition',
    '$-': 'resolveSubtraction',
    '$*': 'resolveMultiplication',
    '$/': 'resolveDivision',
    '$empty': 'resolveEmpty',
    '$notEmpty': 'resolveNotEmpty',
    '$=': 'resolveEqual',
    '$!=': 'resolveNotEqual',
    '$>': 'resolveGreater',
    '$>=': 'resolveGreaterOrEqual',
    '$<': 'resolveLess',
    '$and': 'resolveAnd',
    '$or': 'resolveOr',
    '$class': 'resolveClass',
    '$raw': 'resolveRaw',
    '$state': 'resolveState',
    '$id': 'resolveId',
    '$now': 'resolveNow',
    '$null': 'resolveNull',
    '$number': 'resolveNumber',
    '$master': 'resolveMaster',
    '$currentMonth': 'resolveCurrentMonth',
    '$currentYear': 'resolveCurrentYear',
    '$nextMonth': 'resolveNextMonth',
    '$nextYear': 'resolveNextYear',
    '$previousMonth': 'resolvePreviousMonth',
    '$previousYear': 'resolvePreviousYear',
    '$param': 'resolveParam',
    '$validate': 'resolveValidate'
};
const PREPARATION_MAP = {
    '$duration': 'prepareDuration',
    '$durationTime': 'prepareDurationTime',
    '$join': 'prepareJoin',
    '$map': 'prepareMap',
    '$master': 'prepareMaster',
    '$method': 'prepareMethod',
    '$model': 'prepareModel',
    '$moment': 'prepareMoment',
    '$placeholder': 'preparePlaceholder',
    '$replace': 'prepareReplace',
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

    createOperands (data) {
        return data.map(this.createOperand, this).filter(v => !!v);
    }

    createOperand () {
        return this.calc.createToken(...arguments);
    }

    executeMethod (name, value) {
        return typeof value?.[name] === 'function' ? value[name]() : value;
    }

    log (type, message, data = this.data) {
        CommonHelper.log(this.calc, this.constructor.name, type, message, data);
    }

    // PREPARE

    prepareDuration (data) {
        this._operation = this.resolveDuration;
        this._operands = this.createOperands([data[0]]);
        this._units = data[1] || 'seconds';
        this._method = data[2] || 'humanize';
        this._arguments = data.slice(3);
        return this.resolveOperation;
    }

    prepareDurationTime (data) {
        this._operation = this.resolveDurationTime;
        this._operands = this.createOperands([data[0]]);
        this._units = data[1] || 'seconds';
        this._format = data[2] || 'HH:mm:ss';
        return this.resolveOperation;
    }

    prepareJoin (data) {
        this._operation = this.resolveJoin;
        this._separator = data[0];
        this._operands = this.createOperands(data.slice(1));
        return this.resolveOperation;
    }

    prepareMap (data) {
        this._operation = this.resolveMap;
        this._method = this.executeMethod.bind(this, data[0]);
        this._operands = this.createOperands(data.slice(1));
        return this.resolveOperation;
    }

    prepareMaster (data) {
        this._attrName = data[0];
        return this._attrName ? this.resolveMasterValue : this.resolveMaster;
    }

    prepareMethod (data) {
        this._operation = this.resolveMethod;
        this._method = data[0];
        this._operands = this.createOperands([data[1]]);
        this._arguments = data.slice(2);
        return this.resolveOperation;
    }

    prepareMoment (data) {
        this._operation = this.resolveMoment;
        this._operands = this.createOperands([data[0]]);
        this._method = data[1];
        this._arguments = data.slice(2);
        return this.resolveOperation;
    }

    prepareModel (data) {
        this._attrName = data[0];
        return this._attrName ? this.resolveModelValue : this.resolveModel;
    }

    preparePlaceholder (data) {
        this._placeholder = data[0];
        this._operation = this.resolvePlaceholder;
        this._operands = this.createOperands([data[1]]);
        return this.resolveOperation;
    }

    prepareReplace (data) {
        this._source = data[0];
        this._target = data[1];
        this._operation = Array.isArray(this._source)
            ? this.resolveReplaceByArray
            : this.resolveReplace;
        this._operands = this.createOperands([data[2]]);
        return this.resolveOperation;
    }

    prepareRound (data) {
        this._operation = this.resolveRound;
        this._operands = this.createOperands([data[0]]);
        this._precision = data[1];
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
        let result = Array.isArray(values[0])
            ? this.resolveAddition(values[0])
            : values[0];
        for (let i = 1; i < values.length; ++i) {
            let num = Array.isArray(values[i])
                ? this.resolveAddition(values[i])
                : values[i];
            if (num) {
                result += num;
            }
        }
        return result;
    }

    resolveSubtraction (values) {
        let result = Array.isArray(values[0])
            ? this.resolveSubtraction(values[0])
            : values[0];
        for (let i = 1; i < values.length; ++i) {
            let num = Array.isArray(values[i])
                ? this.resolveSubtraction(values[i])
                : values[i];
            if (num) {
                result -= num;
            }
        }
        return result;
    }

    resolveMultiplication (values) {
        let result = Array.isArray(values[0])
            ? this.resolveMultiplication(values[0])
            : values[0];
        for (let i = 1; i < values.length; ++i) {
            let num = Array.isArray(values[i])
                ? this.resolveMultiplication(values[i])
                : values[i];
            if (num !== undefined) {
                result *= num;
            }
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

    resolveEmpty (values) {
        for (const value of values) {
            if (value !== null && value !== undefined && value !== '') {
                if (!Array.isArray(value) || value.length) {
                    return false;
                }
            }
        }
        return true;
    }

    resolveNotEmpty (values) {
        return !this.resolveEmpty(values);
    }

    resolveEqual (values) {
        const value = JSON.stringify(values[0]);
        for (let i = 1; i < values.length; ++i) {
            if (value !== JSON.stringify(values[i])) {
                return false;
            }
        }
        return true;
    }

    resolveNotEqual () {
        return !this.resolveEqual(...arguments);
    }

    resolveGreater (values) {
        return values[0] > values[1];
    }

    resolveGreaterOrEqual (values) {
        return values[0] >= values[1];
    }

    resolveLess (values) {
        return values[0] < values[1];
    }

    resolveLessOrEqual (values) {
        return values[0] <= values[1];
    }

    resolveAnd (values) {
        for (const value of values) {
            if (!value) {
                return false;
            }
        }
        return true;
    }

    resolveOr (values) {
        for (const value of values) {
            if (value) {
                return true;
            }
        }
        return false;
    }

    resolveClass ([name], {view}) {
        const cls = view.meta.getClass(name);
        return cls ? cls.title : name;
    }

    resolveJoin (values) {
        const join = value => Array.isArray(value)
            ? value.join(this._separator)
            : value;
        return values.map(join).join(this._separator);
    }

    resolveMap (values) {
        const results = values.map(value => {
            return Array.isArray(value)
                ? value.map(this._method)
                : this._method(value);
        });
        return [].concat(...results);
    }

    resolveMaster ({model}) {
        const master = model.getMasterModel();
        return master ? master.getId() : this.data;
    }

    resolveMasterValue ({model}) {
        const master = model.getMasterModel();
        return master ? master.get(this._attrName) : this.data;
    }

    resolveMethod ([value]) {
        return typeof value?.[this._method] === 'function'
            ? value[this._method](...this._arguments)
            : value;
    }

    resolveModel ({model}) {
        return model instanceof Model ? model.getId() : this.data;
    }

    resolveModelValue ({model}) {
        return model instanceof Model ? model.get(this._attrName) : this.data;
    }

    resolveDuration ([value]) {
        if (!value && value !== 0) {
            return value;
        }
        const date = moment.duration(value, this._units).locale(this.calc.language);
        return typeof date[this._method] === 'function'
            ? date[this._method](...this._arguments)
            : date;
    }

    resolveDurationTime ([value]) {
        if (!value && value !== 0) {
            return value;
        }
        const ms = moment.duration(value, this._units).asMilliseconds();
        return moment.utc(ms).format(this._format);
    }

    resolveMoment ([value]) {
        if (!value) {
            return value;
        }
        const date = moment(value).locale(this.calc.language);
        return typeof date[this._method] === 'function'
            ? date[this._method](...this._arguments)
            : date;
    }

    resolvePlaceholder ([value]) {
        return value === undefined || value === null || value === ''
            ? this._placeholder
            : value;
    }

    resolveReplace ([value]) {
        return value === this._source ? this._target : value;
    }

    resolveReplaceByArray ([value]) {
        return this._source.includes(value) ? this._target : value;
    }

    resolveRaw () {
        return this.data[1];
    }

    resolveRound ([value]) {
        return Number.isFinite(value)
            ? MathHelper.round(value, this._precision)
            : value;
    }

    resolveState ([name], {view}) {
        const state = view.class.getState(name);
        return state ? state.title : name;
    }

    resolveId ([value], {view}) {
        return view.class.getDb().normalizeId(value);
    }

    resolveNow () {
        return new Date;
    }

    resolveNull () {
        return null;
    }

    resolveNumber ([value]) {
        if (typeof value === 'number') {
            return value;
        }
        return parseFloat(typeof value !== 'string' ? String(value) : value);
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

    resolveParam ([name], {model}) {
        return model?.controller.getQueryParam(name);
    }

    resolveValidate (data, {model}) {
        return model?.validate();
    }
};

const CommonHelper = require('areto/helper/CommonHelper');
const MathHelper = require('areto/helper/MathHelper');
const Model = require('../model/Model');
const moment = require('moment');