/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class NumberValidator extends Base {

    constructor (config) {
        super({
            integerOnly: false,
            max: null,
            min: null,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Value must be a number');
    }

    getNotIntegerMessage () {
        return this.createMessage(this.message, 'Number must be a integer');
    }

    getTooSmallMessage () {
        return this.createMessage(this.tooSmall, 'Value must be no less than {min}', {
            min: this.min
        });
    }

    getTooBigMessage () {
        return this.createMessage(this.tooBig, 'Value must be no greater than {max}', {
            max: this.max
        });
    }

    async validateAttr (name, model) {
        await super.validateAttr(...arguments);
        if (!model.hasError()) {
            model.set(name, Number(model.get(name)));
        }
    }

    validateValue (value) {
        const number = Number(value);
        if (isNaN(number)) {
            return this.getMessage();
        }
        if (this.integerOnly && !Number.isSafeInteger(number)) {
            return this.getNotIntegerMessage();
        }
        if (this.min !== null && number < this.min) {
            return this.getTooSmallMessage();
        }
        if (this.max !== null && number > this.max) {
            return this.getTooBigMessage();
        }
    }
};