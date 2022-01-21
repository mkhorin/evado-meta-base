/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./ExpressionValidator');

module.exports = class ConditionValidator extends Base {

    constructor (config) {
        super({
            defaultMessageSource: 'app',
            ...config
        });
    }

    getInvalidMessage () {
        return this.createMessage(this.invalidMessage, 'Invalid condition');
    }

    getMessage () {
        return this.createMessage(this.message, 'Value does not match condition');
    }

    async validateAttr (name, model) {
        const result = await this.resolveExpression(this.condition, name, model);
        if (!result) {
            this.addError(model, name, this.getMessage());
        }
    }
};