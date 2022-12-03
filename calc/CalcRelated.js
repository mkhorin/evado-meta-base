/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Examples of calculated expressions
 *
 * ["$related", "operation", "refAttr", ...] - See CalcQuery for operations
 * ["$related", "operation", "refAttr/viewName", ...]
 * ["$related", "models", "refAttr", {"attr": "attrName"}]
 * ["$related", "models", "refAttr/viewName", {"attr": "attrName"}]
 * ["$related", "models", "refAttr.nestedRefAttr", {"unique": true}]
 * ["$related", "models", "refAttr/viewName.nestedRefAttr", {"unique": true}]
 */
'use strict';

const RELATED_OPERATIONS = [
    'model',
    'models',
    'title',
    'titles'
];
const Base = require('./CalcQuery');

module.exports = class CalcRelated extends Base {

    prepareResolvingMethod () {
        const operation = this.data[1];
        this._operation = this.getOperation(operation);
        if (!this._operation) {
            return this.resolveNull;
        }
        this._items = this.getRelatedChain(this.data[2]);
        if (!this._items) {
            return this.resolveNull;
        }
        this._attr = this._items[0].attr;
        this._view = this._items[0].view;
        this.prepareParams();
        return RELATED_OPERATIONS.includes(operation)
            ? this._operation
            : this.resolveOperation;
    }

    prepareParams () {
        super.prepareParams();
        this._unique = this.getUnique();
    }

    getUnique () {
        return this._params.hasOwnProperty('unique')
            ? this._params.unique
            : this._items.length > 1;
    }

    getRelatedChain (data) {
        if (typeof data !== 'string') {
            return this.log('error', 'Related data must be string');
        }
        let items = [], item;
        for (let attr of data.split('.')) {
            item = this.getRelatedChainItem(attr, item);
            if (!item) {
                return null;
            }
            items.push(item);
        }
        return items;
    }

    getRelatedChainItem (data, previous) {
        const [attrName, viewName] = data.split('/');
        const baseView = previous ? previous.view : this.view;
        const attr = baseView.resolveAttr(attrName);
        if (!attr) {
            return this.log('error', `Attribute not found: ${attrName}.${baseView.id}`);
        }
        if (!attr.isRelation()) {
            return this.log('error', `Not relation attribute: ${attr.id}`);
        }
        const view = viewName
            ? attr.relation.refClass.getView(viewName)
            : attr.getEagerView();
        if (!view) {
            return this.log('error', `View not found: ${data}`);
        }
        return {attr, view};
    }

    async createQuery (params) {
        const query = await params.model.related.createQuery(this._attr, this._view);
        this.setQueryParams(query);
        return query.withReadData();
    }

    async getRelatedModels (items, models) {
        const result = [];
        const attr = items[0].attr;
        const view = items[0].view;
        for (const model of models) {
            const query = await model.related.createQuery(attr, view);
            if (this._unique && result.length) {
                query.exceptId(result.map(model => model.getId()));
            }
            result.push(...await query.withReadData().all());
        }
        return items.length > 1
            ? this.getRelatedModels(items.slice(1), result)
            : result;
    }

    // RESOLVE

    async resolveModel (params) {
        const models = await this.getRelatedModels(this._items, [params.model]);
        const model = models[0];
        return model && this._params.attr
            ? model.get(this._params.attr)
            : model;
    }

    async resolveModels (params) {
        const models = await this.getRelatedModels(this._items, [params.model]);
        return this._params.attr
            ? models.map(model => model.get(this._params.attr))
            : models;
    }

    async resolveTitle (params) {
        const titles = await this.resolveTitles(params);
        return titles.length ? titles[0] : null;
    }

    async resolveTitles (params) {
        const models = await this.getRelatedModels(this._items, [params.model]);
        return models.map(model => model.getTitle());
    }
};