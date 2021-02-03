/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Examples of calculated expressions
 *
 * ["$query", "count", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]
 * ["$query", "count", "viewName.className", {}, {"$key": ".attrName"}] - $key - alias for primary key
 * ["$query", "count", "viewName.className", {}, {"backRefAttrName": ".$key"}]
 * ["$query", "column", "className", {"key": "attrName", "order": {"attrName": 1}}]
 * ["$query", "scalar", "className", {"key": "attrName", "order": {"attrName": -1}}]
 * ["$query", "ids", "className", {"order": {"attrName": -1}}]
 * ["$query", "id", "className", {"order": {"attrName": -1}}]
 * ["$query", "id", "className", {}, {"userAttrName": "$user"}] - $user - current user
 * ["$query", "model", "className", null, [condition]]
 * ["$query", "models", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]
 * ["$query", "title", "className", null, [condition]] - model title
 * ["$query", "titles", "className", {order:{"$key": -1}, limit: 10, offset: 10}, [condition]]
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcQuery extends Base {

    prepareResolvingMethod () {
        this._operation = this.getOperation(this.data[1]);
        if (!this._operation) {
            return this.resolveNull;
        }
        this._view = this.getView(this.data[2]);
        if (!this._view) {
            return this.resolveNull;
        }
        this.prepareParams();
        return this.resolveOperation;
    }

    prepareParams () {
        this._params = this.data[3] || {};
        this._condition = this.createCondition(this.data[4]);
        this._column = this.createColumnName();
        this._order = this.createOrder();
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

    createCondition (data) {
        return data ? this.calc.createToken(['$condition', data]) : null;
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
        const query = this._view.createQuery();
        this.setQueryParams(query);
        return query;
    }

    setQueryParams (query) {
        if (this._params.limit) {
            query.limit(this._params.limit);
        }
        if (this._params.offset) {
            query.offset(this._params.offset);
        }
        if (this._order) {
            query.order(this._order);
        }
    }

    // RESOLVE

    async resolveOperation (params) {
        const query = await this.createQuery(params);
        query.module = params.view.meta.module;
        query.user = params.user;
        if (this._condition) {
            query.and(await this._condition.resolve(params));
        }
        return this._operation(query);
    }

    resolveNull () {
        return null;
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

    resolveModel (query) {
        return query.withReadData().one();
    }

    resolveModels (query) {
        return query.withReadData().all();
    }

    async resolveTitle (query) {
        const model = await query.withTitle().one();
        return model?.getTitle();
    }

    async resolveTitles (query) {
        const models = await query.withTitle().all();
        return models.map(model => model.getTitle());
    }
};

const ObjectHelper = require('areto/helper/ObjectHelper');
const StringHelper = require('areto/helper/StringHelper');