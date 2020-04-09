/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$query", "count", "class", {order:{}, limit: 10, offset: 10}, [condition]]
// ["$query", "count", "view.class", {}, {"$key": ".attrName"}] // $key - alias for primary key name
// ["$query", "count", "view.class", {}, {"backReference": ".$key"}]
// ["$query", "scalar", "class", {"key": "num", "order": {"num": 1}}] // minimum

const Base = require('./CalcToken');

module.exports = class CalcQuery extends Base {

    init () {
        this.method = this.getMethod(this.operands[0]);
        this.view = this.getView(this.operands[1]);
        if (this.view) {
            this.params = this.operands[2] || {};
            this.condition = this.createCondition(this.operands[3]);
        }
    }
    
    getMethod (name) {
        if (typeof name === 'string') {
            name = `resolve${StringHelper.toFirstUpperCase(name)}`;
        }
        const method = this.constructor.prototype[name];
        return typeof method !== 'function'            
            ? this.log('error', `Solution method not found: ${name}`)
            : method;
    }
    
    getView (id) {
        return this.calc.getView(id)
            || this.calc.getClass(id)
            || this.log('error', `View not found: ${id}`);
    }
    
    createQuery () {
        const query = this.view.find();
        if (this.params.limit) {
            query.limit(this.params.limit);
        }
        if (this.params.offset) {
            query.offset(this.params.offset);
        }
        if (this.params.order) {
            query.order(this.params.order);
        }
        return query;
    }
    
    createCondition (data) {
        return new CalcCondition({token: this, data});
    }

    async resolve (model) {
        if (!this.method) {
            return null;
        }
        const query = this.createQuery();
        query.module = model.module;
        query.user = model.user;
        const condition = await this.condition.resolve(model);
        if (condition) {
            query.and(condition);
        }
        return this.method.call(this, query);
    }

    resolveCount (query) {
        return query.count();
    }

    resolveScalar (query) {
        return query.scalar(this.params.key);
    }

    resolveColumn (query) {
        return query.column(this.params.key);
    }
};

const StringHelper = require('areto/helper/StringHelper');
const CalcCondition = require('./CalcCondition');