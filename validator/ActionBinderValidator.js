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

    getDisabledMessage () {
        return this.createMessage(this.disabledMessage, 'Value cannot be changed');
    }

    validateAttr () {
        this.validateRequireAction(...arguments);
        this.validateEnableAction(...arguments);
    }

    validateRequireAction (name, model) {
        if (this.isEmptyValue(model.get(name))) {
            if (this.actionBinder.validateAction('require', model)) {
                this.addError(model, name, this.getRequiredMessage());
            }
        }
    }

    validateEnableAction (name, model) {
        if (!this.actionBinder.validateAction('enable', model)) {
            const empty = this.isEmptyValue(model.get(name));
            const oldEmpty = this.isEmptyValue(model.getOldValue(name));
            if (!empty || !oldEmpty) {
                if (model.isValueChanged(name)) {
                    this.addError(model, name, this.getDisabledMessage());
                }
            }
        }
    }
};