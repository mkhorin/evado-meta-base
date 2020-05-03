/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$query", "count", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]
// ["$query", "count", "viewName.className", {}, {"$key": ".attrName"}] // $key - alias for primary key name
// ["$query", "count", "viewName.className", {}, {"backRefAttrName": ".$key"}]
// ["$query", "column", "className", {"key": "attrName", "order": {"attrName": 1}}]
// ["$query", "scalar", "className", {"key": "attrName", "order": {"attrName": -1}}]
// ["$query", "ids", "className", {"order": {"attrName": -1}}]
// ["$query", "id", "className", {"order": {"attrName": -1}}]
// ["$query", "title", "className", null, [condition]]
// ["$query", "titles", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]

const Base = require('./CalcToken');

module.exports = class CalcQuery extends Base {

    init () {
        this.method = this.getMethod(this.operands[0]);
        this.view = this.getView(this.operands[1]);
        if (this.view) {
            this.params = this.operands[2] || {};
            this.condition = this.createCondition(this.operands[3]);
            this.columnName = this.createColumnName();
            this.order = this.createOrder();
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

    createColumnName () {
        return typeof this.params.key === 'string'
            ? this.params.key.replace('$key', this.view.getKey())
            : null;
    }

    createOrder (data) {
        ObjectHelper.replaceKeys({'$key': this.view.getKey()}, this.params.order);
        return this.params.order;
    }
    
    createQuery () {
        const query = this.view.find();
        if (this.params.limit) {
            query.limit(this.params.limit);
        }
        if (this.params.offset) {
            query.offset(this.params.offset);
        }
        if (this.order) {
            query.order(this.order);
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

    resolveColumn (query) {
        return query.column(this.columnName);
    }

    resolveScalar (query) {
        return query.scalar(this.columnName);
    }

    resolveIds (query) {
        return query.ids();
    }

    resolveId (query) {
        return query.id();
    }

    async resolveTitle (query) {
        const model = await query.withTitle().one();
        return model ? model.getTitle() : null;
    }

    async resolveTitles (query) {
        const models = await query.withTitle().all();
        return models.map(model => model.getTitle());
    }
};

const ObjectHelper = require('areto/helper/ObjectHelper');
const StringHelper = require('areto/helper/StringHelper');
const CalcCondition = require('./CalcCondition');