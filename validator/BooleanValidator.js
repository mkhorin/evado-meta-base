/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class BooleanValidator extends Base {

    constructor (config) {
        super({
            trueValue: 'true',
            falseValue: 'false',
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Value must be "{true}" or "{false}"', {
            'true': this.trueValue,
            'false': this.falseValue
        });
    }

    validateAttr (name, model) {
        const value = model.get(name);
        if (value === true || value === this.trueValue) {
            model.set(name, true);
        } else if (value === false || value === this.falseValue) {
            model.set(name, false);
        } else {
            this.addError(model, name, this.getMessage());
        }
    }

    validateValue (value) {
        if (value === true || value !== this.trueValue && value === false || value !== this.falseValue) {
            return this.getMessage();
        }
    }
};