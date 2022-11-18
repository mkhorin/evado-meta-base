/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class StringValidator extends Base {

    /**
     * @param {Object} config
     * @param {boolean} config.shrinking - Replace multiple spaces with one
     */
    constructor (config) {
        super({
            length: null,
            min: null,
            max: null,
            shrinking: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Value must be a string');
    }

    getTooShortMessage () {
        return this.createMessage(this.tooShort, 'Value should contain at least {min} chr.', {
            min: this.min
        });
    }

    getTooLongMessage () {
        return this.createMessage(this.tooLong, 'Value should contain at most {max} chr.', {
            max: this.max
        });
    }

    getNotEqualMessage () {
        return this.createMessage(this.notEqual, 'Value should contain {length} chr.', {
            length: this.length
        });
    }

    async validateAttr (name, model) {
        if (this.shrinking) {
            this.shrink(...arguments);
        }
        return super.validateAttr(...arguments);
    }

    shrink (name, model) {
        const value = model.get(name);
        if (typeof value === 'string') {
            model.set(name, value.replace(/(\s)+/g, '$1'));
        }
    }

    validateValue (value) {
        if (typeof value !== 'string') {
            return this.getMessage();
        }
        const length = value.length;
        if (this.min !== null && length < this.min) {
            return this.getTooShortMessage();
        }
        if (this.max !== null && length > this.max) {
            return this.getTooLongMessage();
        }
        if (this.length !== null && length !== this.length) {
            return this.getNotEqualMessage();
        }
    }
};