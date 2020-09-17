/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcDescendants extends Base {

    prepareResolvingMethod () {
        this._view = this.calc.attr.class;
        this._key = this._view.getKey();
        this._parentName = this.data[1];
        this._condition = this.createCondition(this.data[2]);
        return this.resolveDescendants;
    }

    createCondition (data) {
        if (!data) {
            return null;
        }
        return new CalcCondition({
            calc: this.calc,
            view: this.view,
            data
        });
    }

    async resolveDescendants ({model}) {
        const result = [];
        if (model.isNew()) {
            return result;
        }
        const query = this._view.createQuery();
        query.module = model.module;
        if (this._condition) {
            query.and(await this._condition.resolve(model));
        }
        const parentCondition = {[this._parentName]: model.getId()};
        query.and(parentCondition);
        return this.resolveChildren(query, parentCondition, result);
    }

    async resolveChildren (query, parentCondition, result) {
        const ids = await query.column(this._key);
        if (!ids.length) {
            return result;
        }
        result.push(...ids);
        parentCondition[this._parentName] = ids;
        return this.resolveChildren(query, parentCondition, result);
    }
};

const CalcCondition = require('./CalcCondition');