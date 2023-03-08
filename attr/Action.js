/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Action extends Base {

    static getConstants () {
        return {
            OPERATORS: {
                'and': 'validateAnd',
                'or': 'validateOr',
                'empty': 'validateEmpty',
                'notEmpty': 'validateNotEmpty',
                'between': 'validateBetween',
                'notBetween':'validateNotBetween',
                'in': 'validateIn',
                'notIn': 'validateNotIn',
                'regex': 'validateRegex',
                '=': 'validateEqual',
                '!=': 'validateNotEqual',
                '>': 'validateGreater',
                '>=': 'validateGreaterOrEqual',
                '<': 'validateLess',
                '<=': 'validateLessOrEqual'
            }
        };
    }

    hasValue (value) {
        return value !== undefined
            && value !== null
            && value !== ''
            && value !== false;
    }

    validate (model) {
        return this.executeValidation(this.data, model);
    }

    executeValidation (data, model) {
        if (!Array.isArray(data)) {
            return this.validateHash(data, model);
        }
        let operator = data[0];
        if (operator && typeof operator === 'object') {
            operator = 'and';
        } else {
            data = data.slice(1);
        }
        if (Object.prototype.hasOwnProperty.call(this.OPERATORS, operator)) {
            return this[this.OPERATORS[operator]](operator, data, model);
        }
        this.log('error', `Operator not found: ${operator}`);
    }

    validateHash (data, model) {
        for (const name of Object.keys(data)) {
            const value = model.getCastedValue(name);
            if (Array.isArray(data[name])) {
                if (!data[name].includes(value)) {
                    return false;
                }
            } else if (data[name] !== value) {
                return false;
            }
        }
        return true;
    }

    validateAnd (operator, operands, model) {
        if (operands.length === 0) {
            return this.logDataError(operator, operands);
        }
        for (const operand of operands) {
            if (!this.executeValidation(operand, model)) {
                return false;
            }
        }
        return true;
    }

    validateOr (operator, operands, model) {
        if (operands.length === 0) {
            return this.logDataError(operator, operands);
        }
        for (const operand of operands) {
            if (this.executeValidation(operand, model)) {
                return true;
            }
        }
        return false;
    }

    validateEmpty () {
        return !this.validateNotEmpty(...arguments);
    }

    validateNotEmpty (operator, operands, model) {
        return operands.length !== 1
            ? this.logDataError(operator, operands)
            : this.hasValue(model.get(operands[0]));
    }

    validateBetween (operator, operands, model) {
        if (operands.length !== 3) {
            return this.logDataError(operator, operands);
        }
        const value = model.getCastedValue(operands[0]);
        return value >= operands[1] && value <= operands[2];
    }

    validateNotBetween () {
        return !this.validateBetween(...arguments);
    }

    validateIn (operator, operands, model) {
        return operands.length !== 2 || !Array.isArray(operands[1])
            ? this.logDataError(operator, operands)
            : operands[1].includes(model.getCastedValue(operands[0]));
    }

    validateNotIn () {
        return !this.validateIn(...arguments);
    }

    validateRegex (operator, operands, model) {
        if (operands.length < 2) {
            return this.logDataError(operator, operands);
        }
        const regex = new RegExp(operands[1], operands[2]);
        return regex.test(model.get(operands[0]));
    }

    validateEqual (operator, operands, model) {
        return operands.length !== 2
            ? this.logDataError(operator, operands)
            : operands[1] === model.getCastedValue(operands[0]);
    }

    validateNotEqual () {
        return !this.validateEqual(...arguments);
    }

    validateGreater (operator, operands, model) {
        return operands.length !== 2
            ? this.logDataError(operator, operands)
            : model.getCastedValue(operands[0]) > operands[1];
    }

    validateGreaterOrEqual (operator, operands, model) {
        return operands.length !== 2
            ? this.logDataError(operator, operands)
            : model.getCastedValue(operands[0]) >= operands[1];
    }

    validateLess (operator, operands, model) {
        return operands.length !== 2
            ? this.logDataError(operator, operands)
            : model.getCastedValue(operands[0]) < operands[1];
    }

    validateLessOrEqual (operator, operands, model) {
        return operands.length !== 2
            ? this.logDataError(operator, operands)
            : model.getCastedValue(operands[0]) <= operands[1];
    }

    logDataError (operator, operands) {
        this.log('error', `${operator}: operands invalid: ${JSON.stringify(operands)}`);
    }

    log () {
        CommonHelper.log(this.binder, this.name, ...arguments);
    }
};
module.exports.init();

const CommonHelper = require('areto/helper/CommonHelper');