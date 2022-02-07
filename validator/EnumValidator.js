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

    async validateAttr (name, model) {
        const value = model.get(name);
        const attr = model.class.getAttr(name);
        if (attr.enum && !attr.enum.hasItem(value) && !attr.enum.getQueryableItem(value)) {
            this.addError(model, name, this.getMessage());
        }
    }
};