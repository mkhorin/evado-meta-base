/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class RequiredValidator extends Base {

    constructor (config) {
        super({
            requiredValue: null,
            strict: false,
            ...config
        });
        this.skipOnEmpty = false;
    }

    getMessage () {
        return this.createMessage(this.message, 'Value cannot be blank');
    }

    getRequiredMessage () {
        return this.createMessage(this.message, 'Value must be "{requiredValue}"', {
            requiredValue: this.requiredValue
        });
    }

    validateAttr (name, model) {
        const attr = model.class.getAttr(name);
        if (!attr.isBoolean()) {
            return super.validateAttr(name, model);
        }
        const value = model.get(name);
        if (value !== true && value !== 'true') {
            this.addError(model, name, this.getMessage());
        }
    }

    validateValue (value) {
        if (this.requiredValue === null) {
            return this.isEmptyValue(value) ? this.getMessage() : null;
        }
        if (this.strict ? value === this.requiredValue : value == this.requiredValue) {
            return null;
        }
        return this.getRequiredMessage();
    }
};