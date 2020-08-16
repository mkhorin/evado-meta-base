/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class ExpressionValidator extends Base {

    getInvalidMessage () {
        return this.createMessage(this.invalidMessage, 'Invalid expression');
    }

    getMessage (requiredValue) {
        if (typeof requiredValue !== 'string') {
            requiredValue = JSON.stringify(requiredValue);
        }
        return this.createMessage(this.message, 'Value must be "{requiredValue}"', {requiredValue});
    }

    async validateAttr (name, model) {
        const value = await this.resolveExpression(this.expression, name, model);
        if (!CommonHelper.isEqual(value, model.get(name))) {
            this.addError(model, name, this.getMessage(value));
        }
    }

    resolveExpression (config, name, model) {
        if (typeof config.Class === 'string') {
            config = model.class.meta.resolveSpawn(config);
        }
        if (!config) {
            return this.addError(model, name, this.getInvalidMessage());
        }
        const attr = model.class.getAttr(name);
        if (config.Class) {
            const expression = model.spawn(config, {attr});
            return expression.resolve(model);
        }
        const calc = attr.spawnCalc(config);
        return calc.resolve(model);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');