/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class ExpressionValidator extends Base {

    getMessage (value) {
        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }
        return this.createMessage(this.message, 'Value must be "{requiredValue}"', {requiredValue: value});
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
            return this.addError(model, name, this.createMessage('Invalid expression'));
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