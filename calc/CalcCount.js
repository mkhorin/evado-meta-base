/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * ["$count", "viewName.className", [condition]]
 */
'use strict';

const Base = require('./CalcQuery');

module.exports = class CalcCount extends Base {

    prepareResolvingMethod () {
        this._operation = this.resolveCount;
        this._params = {};
        this._view = this.getView(this.data[1]);
        if (this._view) {
            this._condition = this.createCondition(this.data[2]);
        }
        return this.resolveOperation;
    }

    createQuery () {
        return this._view.createQuery();
    }
};