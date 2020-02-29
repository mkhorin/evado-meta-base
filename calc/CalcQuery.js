/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// $key - alias for primary key name
// ["$query", "count", "class", {order:{}, limit: 10, offset: 10}, [condition]]
// ["$query", "count", "view.class", {}, {"$key": ".attrName"}]
// ["$query", "count", "view.class", {}, {"backReference": ".$key"}]
// ["$query", "scalar", "class", {"key": "num", "order": {"num": 1}}] // minimum

const Base = require('./CalcToken');

module.exports = class CalcQuery extends Base {

    init () {
        this.method = this.getMethod(this.operands[0]);
        this.view = this.getView(this.operands[1]);
        if (this.view) {
            this.params = this.operands[2] || {};
            this.query = this.createQuery(this.params);
            this.condition = this.createCondition(this.operands[3]);
        }
    }
    
    getMethod (name) {
        name = typeof name === 'string' ? StringHelper.toFirstUpperCase(name) : null;
        name = `resolve${name}`;        
        const method = this.constructor.prototype[name];
        return typeof method !== 'function'            
            ? this.log('error', `Solution method not found: ${name}`)
            : method;
    }
    
    getView (id) {
        return this.calc.getView(id) || this.calc.getClass(id) || this.log('error', `View not found: ${id}`);
    }
    
    createQuery ({limit, offset, order}) {
        const query = this.view.find();
        if (limit) {
            query.limit(limit);
        }
        if (offset) {
            query.offset(offset);
        }
        if (order) {
            query.order(order);
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
        const condition = await this.condition.resolve(model);
        this.query.prepared = false;
        this.query.where(this.view.class.filter);
        if (condition) {
            this.query.and(condition);
        }
        this.query.module = model.module;
        this.query.user = model.user;
        return this.method.call(this);
    }

    resolveCount () {
        return this.query.count();
    }

    resolveScalar () {
        return this.query.scalar(this.params.key);
    }

    resolveColumn () {
        return this.query.column(this.params.key);
    }
};

const StringHelper = require('areto/helper/StringHelper');
const CalcCondition = require('./CalcCondition');