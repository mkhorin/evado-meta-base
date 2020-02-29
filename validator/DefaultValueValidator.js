/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class DefaultValueValidator extends Base {

    constructor (config) {
        super({
            value: null,
            skipOnEmpty: false,
            ...config
        });
    }

    validateAttr (name, model) {
        if (this.isEmptyValue(model.get(name))) {
            const attr = model.view.attrMap[name];
            if (this.value === null && attr.hasDefaultValue()) {
                model.set(name, attr.data.defaultValue);
            } else {
                model.set(name, this.value);
            }
        }
    }
};