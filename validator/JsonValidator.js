/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class JsonValidator extends Base {

    constructor (config) {
        super({
            skipOnEmpty: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid JSON');
    }

    async validateAttr (name, model) {
        const value = model.get(name);
        try {
            if (typeof value !== 'string') {
                JSON.stringify(value); // throw exception on cyclic object
            } else if (model.isValueChanged(name)) {
                model.set(name, value ? JSON.parse(value) : null);
            }
        } catch {
            this.addError(model, name, this.getMessage());
        }
    }
};