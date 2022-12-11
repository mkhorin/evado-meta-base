/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class EnumValidator extends Base {

    constructor (config) {
        super({
            defaultMessageSource: 'app',
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid enum value');
    }

    validateAttr (name, model) {
        const attr = model.class.getAttr(name);
        if (!attr.enum) {
            return;
        }
        let values = model.get(name);
        if (typeof values === 'string' && values) {
            values = values.split(',');
        }
        if (Array.isArray(values)) {
            for (const value of values) {
                this.validateValue(value, attr, model);
            }
        } else {
            this.validateValue(values, attr, model);
        }
    }

    validateValue (value, attr, model) {
        if (!attr.enum.hasItem(value)) {
            if (!attr.enum.getQueryableItem(value)) {
                this.addError(model, attr.name, this.getMessage());
            }
        }
    }
};