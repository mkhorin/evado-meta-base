/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class ExpressionValidator extends Base {

    getInvalidExpressionMessage () {
        return this.createMessage(this.invalidExpressionMessage, 'Invalid expression');
    }

    getMessage (requiredValue) {
        if (typeof requiredValue !== 'string') {
            requiredValue = JSON.stringify(requiredValue);
        }
        return this.createMessage(this.message, 'Value must be "{requiredValue}"', {requiredValue});
    }

    async validateAttr (name, model) {
        let config = this.expression;
        if (typeof config.Class === 'string') {
            config = model.class.meta.resolveSpawn(config);
        }
        if (!config) {
            return this.addError(model, name, this.getInvalidExpressionMessage());
        }
        let attr = model.class.getAttr(name);
        let value = null;
        if (config.Class) {
            const expression = model.spawn(config, {attr});
            value = await expression.resolve(model);
        } else {
            const calc = attr.spawnCalc(config);
            value = await calc.resolveValue(model);
        }
        if (!CommonHelper.isEqual(value, model.get(name))) {
            this.addError(model, name, this.getMessage(value));
        }
    }
};

const CommonHelper = require('areto/helper/CommonHelper');