/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class DateValidator extends Base {

    constructor (config) {
        super({
            max: null,
            min: null,
            ...config
        });
        if (this.min) {
            this.min = this.resolveDate(this.min);
        }
        if (this.max) {
            this.max = this.resolveDate(this.max);
        }
    }

    resolveDate (src) {
        const date = src instanceof Date ? src : src === 'now' ? new Date : new Date(src);
        if (DateHelper.isValid(date)) {
            return date;
        }
        throw new Error(`Invalid date: ${src}`);
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid date');
    }

    getTooSmallMessage () {
        return this.createMessage(this.tooSmall, 'Date must be no less than {min}', {
            min: this.min.toISOString()
        });
    }

    getTooBigMessage () {
        return this.createMessage(this.tooBig, 'Date must be no greater than {max}', {
            max: this.max.toISOString()
        });
    }

    validateAttr (name, model) {
        let value = model.get(name);
        value = value instanceof Date ? value : new Date(value);
        model.set(name, value);
        return super.validateAttr(...arguments);
    }

    validateValue (value) {
        if (!DateHelper.isValid(value)) {
            return this.getMessage();
        }
        if (this.min && value < this.min) {
            return this.getTooSmallMessage();
        }
        if (this.max && value > this.max) {
            return this.getTooBigMessage();
        }
    }
};

const DateHelper = require('areto/helper/DateHelper');