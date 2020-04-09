/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$descendants", "parentAttrName", [condition]] // get descendant ids by parent

const Base = require('./CalcToken');

module.exports = class CalcDescendants extends Base {

    init () {
        this.method = this.resolve;
        this.view = this.calc.attr.class;
        this.key = this.view.getKey();
        this.parentName = this.operands[0];
        this.condition = this.createCondition(this.operands[1]);
    }

    createCondition (data) {
        return data ? new CalcCondition({token: this, data}) : null;
    }

    async resolve (model) {
        const result = [];
        if (model.isNew()) {
            return result;
        }
        const query = this.view.find();
        query.module = model.module;
        if (this.condition) {
            query.and(await this.condition.resolve(model));
        }
        const parentCondition = {[this.parentName]: model.getId()};
        query.and(parentCondition);
        return this.resolveChildren(query, parentCondition, result);
    }

    async resolveChildren (query, parentCondition, result) {
        const ids = await query.column(this.key);
        if (!ids.length) {
            return result;
        }
        result.push(...ids);
        parentCondition[this.parentName] = ids;
        return this.resolveChildren(query, parentCondition, result);
    }
};

const CalcCondition = require('./CalcCondition');