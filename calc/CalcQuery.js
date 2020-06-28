/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$query", "count", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]
// ["$query", "count", "viewName.className", {}, {"$key": ".attrName"}] // $key - alias for primary key
// ["$query", "count", "viewName.className", {}, {"backRefAttrName": ".$key"}]
// ["$query", "column", "className", {"key": "attrName", "order": {"attrName": 1}}]
// ["$query", "scalar", "className", {"key": "attrName", "order": {"attrName": -1}}]
// ["$query", "ids", "className", {"order": {"attrName": -1}}]
// ["$query", "id", "className", {"order": {"attrName": -1}}]
// ["$query", "id", "className", {}, {"userAttrName": "$user"}] // $user - current user
// ["$query", "title", "className", null, [condition]]
// ["$query", "titles", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]

const Base = require('./CalcToken');

module.exports = class CalcQuery extends Base {

    prepareResolvingMethod () {
        this._operation = this.getOperation(this.data[1]);
        this._view = this.getView(this.data[2]);
        if (this._view) {
            this._params = this.data[3] || {};
            this._condition = this.createCondition(this.data[4]);
            this._column = this.createColumnName();
            this._order = this.createOrder();
        }
        return this.resolveOperation;
    }

    getOperation (name) {
        if (typeof name === 'string') {
            name = `resolve${StringHelper.toFirstUpperCase(name)}`;
        }
        return typeof this[name] !== 'function'
            ? this.log('error', `Operation not found: ${name}`)
            : this[name];
    }
    
    getView (id) {
        return this.calc.getView(id)
            || this.calc.getClass(id)
            || this.log('error', `View not found: ${id}`);
    }

    createColumnName () {
        const name = this._params.key;
        return name === '$key' ? this._view.getKey() : name;
    }

    createOrder () {
        ObjectHelper.replaceKeys({'$key': this._view.getKey()}, this._params.order);
        return this._params.order;
    }
    
    createQuery () {
        const query = this._view.find();
        if (this._params.limit) {
            query.limit(this._params.limit);
        }
        if (this._params.offset) {
            query.offset(this._params.offset);
        }
        if (this._order) {
            query.order(this._order);
        }
        return query;
    }

    createCondition (data) {
        return data ? this.calc.createToken(['$condition', data]) : null;
    }

    // RESOLVE

    async resolveOperation (params) {
        if (!this._operation) {
            return null;
        }
        const query = this.createQuery();
        query.module = params.view.meta.module;
        query.user = params.user;
        if (this._condition) {
            const condition = await this._condition.resolve(params);
            if (condition) {
                query.and(condition);
            }
        }
        return this._operation(query);
    }

    resolveCount (query) {
        return query.count();
    }

    resolveColumn (query) {
        return query.column(this._column);
    }

    resolveScalar (query) {
        return query.scalar(this._column);
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