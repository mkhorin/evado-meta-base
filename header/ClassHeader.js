/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Header');

module.exports = class ClassHeader extends Base {

    resolveModel (model) {
        if (model.header.value === undefined) {
            model.header.value = this._token.resolve(model);
        }
    }
};