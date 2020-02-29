/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Operand');

module.exports = class AttrOperand extends Base {

    resolve (model) {
        return model.get(this.name);
    }
};