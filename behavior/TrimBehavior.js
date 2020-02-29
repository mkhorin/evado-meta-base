/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class TrimBehavior extends Base {

    beforeValidate () {
        const value = this.owner.get(this.attrName);
        if (value && typeof value === 'string') {
            this.owner.set(this.attrName, value.trim());
        }
    }
};