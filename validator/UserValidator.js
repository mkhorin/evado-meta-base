/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class UserValidator extends Base {

    constructor (config) {
        super({
            defaultMessageSource: 'app',
            skipOnEmpty: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid user');
    }

    async validateAttr (name, model) {
        let value = model.get(name);
        if (!value) {
            return model.set(name, null);
        }
        value = await model.getMeta().spawnUser().findById(value).id();
        if (!value) {
            return this.addError(model, name, this.getMessage());
        }
        model.set(name, value);
    }
};