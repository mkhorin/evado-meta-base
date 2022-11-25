/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * attr rules: [{name: "name", param1: ...}]
 * view rules: [{name: "name", attrs: "attr", param1: ...}]
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Validator extends Base {

    static getConstants () {
        return {
            BUILTIN: {
                actionBinder: './ActionBinderValidator',
                boolean: './BooleanValidator',
                condition: './ConditionValidator',
                date: './DateValidator',
                email: './EmailValidator',
                enum: './EnumValidator',
                exist: './ExistValidator',
                expression: './ExpressionValidator',
                json: './JsonValidator',
                number: './NumberValidator',
                range: './RangeValidator',
                regex: './RegexValidator',
                relation: './RelationValidator',
                relationCounter: './RelationCounterValidator',
                required: './RequiredValidator',
                string: './StringValidator',
                totalFileSize: './TotalFileSizeValidator',
                unique: './UniqueValidator',
                user: './UserValidator'
            },
            CUSTOM_VALIDATOR_TYPE: 'custom'
        };
    }

    static prepareRules (rules, meta) {
        if (Array.isArray(rules)) {
            for (const rule of rules) {
                Validator.prepareRule(rule, meta);
            }
        }
    }

    static prepareRule (rule, meta) {
        try {
            if (rule.type === this.CUSTOM_VALIDATOR_TYPE) {
                rule.config = ClassHelper.resolveSpawn(rule.config, meta.module);
            }
            if (rule.when?.Class) {
                rule.when = ClassHelper.resolveSpawn(rule.when, meta.module);
            }
        } catch {
            meta.log('error', 'Validator: Invalid rule configuration:', config);
        }
    }

    static async validateModel (model) {
        for (const validator of model.ensureValidators()) {
            await validator.execute(model);
        }
        return PromiseHelper.setImmediate();
    }

    static createValidators (view) {
        const validators = this.createBaseValidators(view);
        validators.push(...this.createRuleValidators(view.class.data.rules, view));
        for (const attr of view.attrs) {
            validators.push(...this.createAttrValidators(attr.classAttr));
        }
        if (view !== view.class) {
            validators.push(...this.createRuleValidators(view.data.rules, view));
            for (const attr of view.attrs) {
                validators.push(...this.createAttrValidators(attr));
            }
        }
        for (const {name, actionBinder, readOnly} of view.attrs) {
            if (!readOnly && actionBinder.hasVerifiableActions()) {
                validators.push(this.createValidator('actionBinder', name, {actionBinder}));
            }
        }
        return validators;
    }

    static createBaseValidators (view) {
        const validators = [];
        for (const attr of view.attrs) {
            if (attr.relation && !attr.readOnly) {
                validators.push(this.createRelationValidator(attr));
                continue;
            }
            if (attr.required) {
                validators.push(this.createValidator('required', attr.name));
            }
            if (attr.readOnly) {
                continue;
            }
            const validator = this.createAttrTypeValidator(attr);
            if (validator) {
                validators.push(validator);
            }
            if (attr.enum) {
                validators.push(this.createValidator('enum', attr.name));
            }
            if (attr.unique) {
                validators.push(this.createValidator('unique', attr.name, {
                    ignoreCase: attr.isString()
                }));
            }
        }
        return validators;
    }

    static createRelationValidator ({name, required, unique}) {
        return this.createValidator('relation', name, {required, unique});
    }

    static createAttrTypeValidator ({name, type, relation}) {
        if (relation) {
            return this.createRelationValidator(...arguments);
        }
        switch (type) {
            case TYPES.STRING:  {
                return this.createValidator('string', name);
            }
            case TYPES.INTEGER: {
                return this.createValidator('number', name, {
                    integerOnly: true
                });
            }
            case TYPES.BOOLEAN: {
                return this.createValidator('boolean', name);
            }
            case TYPES.DATE: {
                return this.createValidator('date', name);
            }
            case TYPES.FLOAT: {
                return this.createValidator('number', name);
            }
            case TYPES.JSON: {
                return this.createValidator('json', name);
            }
            case TYPES.USER: {
                return this.createValidator('user', name);
            }
        }
        return null;
    }

    static createRuleValidators (rules, view) {
        const validators = [];
        if (Array.isArray(rules)) {
            for (const rule of rules) {
                const names = Array.isArray(rule.attrs)
                    ? rule.attrs.filter(name => view.hasAttr(name))
                    : null;
                validators.push(this.createValidator(rule.type, names, rule));
            }
        }
        return validators;
    }

    static createAttrValidators (attr) {
        const validators = [];
        if (Array.isArray(attr.data.rules)) {
            for (const rule of attr.data.rules) {
                validators.push(this.createValidator(rule.type, attr.name, rule));
            }
        }
        return validators;
    }

    static createValidator (type, attrs, data) {
        if (type === this.CUSTOM_VALIDATOR_TYPE) {
            return ClassHelper.spawn(data.config, {attrs});
        }
        if (this.BUILTIN.hasOwnProperty(type)) {
            const Class = require(this.BUILTIN[type]);
            return new Class({attrs, ...data});
        }
        throw new Error(`${this.name}: Invalid type: ${type}`);
    }

    /**
     * @param {Object} config
     * @param {boolean} config.skipOnEmpty - Skip validation if attribute value is empty
     * @param {boolean} config.skipOnError - Skip validation if attribute already contains error
     * @param {boolean} config.skipOnAnyError - Skip validation if model already contains error
     * @param {string} config.messageSource - Source of translations of custom error messages
     * @param {string} config.defaultMessageSource - Source of translations of default error messages
     * @param {Object} config.when - Check need for validation (spawn condition/Condition)
     */
    constructor (config) {
        super({
            skipOnEmpty: true,
            skipOnError: true,
            skipOnAnyError: false,
            messageSource: 'app',
            defaultMessageSource: 'areto',
            when: null,
            ...config
        });
    }

    createMessage (message, defaultMessage, params) {
        if (message instanceof Message) {
            return message.addParams(params);
        }
        if (message) {
            return new Message(this.messageSource, message, params);
        }
        if (defaultMessage instanceof Message) {
            return defaultMessage.addParams(params);
        }
        return new Message(this.defaultMessageSource, defaultMessage, params);
    }

    async execute (model) {
        if (Array.isArray(this.attrs)) {
            for (const name of this.attrs) {
                if (!await this.isSkippedAttr(name, model)) {
                    await this.validateAttr(name, model);
                }
            }
        } else if (this.attrs) {
            if (!await this.isSkippedAttr(this.attrs, model)) {
                await this.validateAttr(this.attrs, model);
            }
        } else if (!this.skipOnAnyError || !model.hasError()) {
            await this.validateModel(model);
        }
    }

    isSkippedAttr (name, model) {
        return (this.skipOnAnyError && model.hasError())
            || (this.skipOnError && model.hasError(name))
            || (this.skipOnEmpty && this.isEmptyValue(model.get(name)))
            || (this.when && this.resolveSkippingCondition(name, model));
    }

    resolveSkippingCondition () {
        return this.when.Class
            ? this.resolveCustomSkippingCondition(...arguments)
            : this.resolveCalcSkippingCondition(...arguments);
    }

    async resolveCustomSkippingCondition (name, model) {
        const attr = model.class.getAttr(name);
        const condition = model.spawn(this.when, {attr});
        const result = await condition.resolve(model);
        return !result;
    }

    async resolveCalcSkippingCondition (name, model) {
        const attr = model.class.getAttr(name);
        const calc = attr.spawnCalc(this.when);
        const result = await calc.resolve(model);
        return !result;
    }

    hasAttr (name) {
        return Array.isArray(this.attrs)
            ? this.attrs.includes(name)
            : this.attrs === name;
    }

    async validateAttr (name, model) {
        const message = await this.validateValue(model.get(name));
        if (message) {
            this.addError(model, name, message);
        }
    }

    validateModel () {
    }

    validateValue () {
    }

    isEmptyValue (value) {
        return value === undefined || value === null || value === '';
    }

    addError (model, attrName, message) {
        const value = model.get(attrName);
        const attr = model.view.getAttr(attrName);
        message.addParams({
            attr: attr ? attr.getTitle() : attrName,
            value: Array.isArray(value) ? 'array[]' : value
        });
        model.addError(attrName, message);
    }
};
module.exports.init();

const ClassHelper = require('areto/helper/ClassHelper');
const PromiseHelper = require('areto/helper/PromiseHelper');
const {TYPES} = require('../helper/TypeHelper');
const Message = require('areto/i18n/Message');