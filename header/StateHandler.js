/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./ClassHandler');

module.exports = class StateHandler extends Base {

    resolveToken (model) {
        const name = this._token.resolve(model);
        const state = model.class.getState(name);
        return state ? state.title : name;
    }
};