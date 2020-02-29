/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class EnumValidator extends Base {

    getMessage () {
        return this.createMessage(this.message, 'Invalid enum value');
    }

    async validateAttr (name, model) {
        const attr = model.class.getAttr(name);
        if (attr.enum && !attr.enum.hasItem(model.get(name))) {
            this.addError(model, name, this.getMessage());
        }
    }
};