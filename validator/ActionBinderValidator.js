/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class ActionBinderValidator extends Base {

    constructor (config) {
        super(config);
        this.skipOnEmpty = false;
    }

    getRequiredMessage () {
        return this.createMessage(this.requiredMessage, 'Value cannot be blank');
    }

    async validateAttr (name, model) {
        if (!this.actionBinder.validateAction('require', model)) {
            this.addError(model, name, this.getRequiredMessage());
        }
    }
};