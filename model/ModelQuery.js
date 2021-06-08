/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/db/Query');

module.exports = class ModelQuery extends Base {

    constructor (config) {
        super(config);
        this._db = this.view.class.getDb();
        this._from = this.view.class.table;
        this._where = this.view.class.condition.where;
        this._order = this.view.order;
        this._raw = null;
        this._relatedDepth = 0;
        this._maxRelatedDepth = 1;
    }

    byCreator (id) {
        return this.and({[this.view.class.CREATOR_ATTR]: id});
    }

    byEditor (id) {
        return this.and({[this.view.class.EDITOR_ATTR]: id});
    }

    byId (id) {
        return this.and(this.view.class.getIdCondition(id));
    }

    byState (id) {
        return this.and({[this.view.class.STATE_ATTR]: id});
    }

    exceptId (id) {
        return this.and(this.view.class.key.getNotCondition(id));
    }

    id () {
        return this.scalar(this.view.getKey());
    }

    ids () {
        return this.column(this.view.getKey());
    }

    indexByKey () {
        return this.index(this.view.getKey());
    }

    raw (value = true) {
        this._raw = value;
        return this;
    }

    setCustomOrder (value) {
        this._customOrder = value;
        return this;
    }

    setRelatedDepth (depth) {
        this._relatedDepth = depth;
        return this;
    }

    setRelatedFilter (filter) {
        this._relatedFilter = filter;
        return this;
    }

    with (...relations) {
        this._with = this._with || {};
        for (const data of relations) {
            if (typeof data === 'string') {
                this._with[data] = {view: true};
            } else {
                Object.assign(this._with, data);
            }
        }
        return this;
    }

    withFormData (value = true) {
        this._withCalc = value;
        this._withRelated = value;
        this._withStateView = value;
        this._withTitle = value;
        return this;
    }

    withListData (value = true) {
        this._withAttrTitle = value;
        this._withCalc = value;
        this._withRelated = value;
        return this;
    }

    withReadData (value = true) {
        this._withAttrTitle = value;
        this._withCalc = value;
        this._withRelated = value;
        this._withTitle = value;
        return this;
    }

    withRelated (value = true) {
        this._withRelated = value;
        return this;
    }

    withAttrTitle (value = true) {
        this._withAttrTitle = value;
        return this;
    }

    withTitle (value = true) {
        this._withTitle = value;
        return this;
    }

    withCalc (value = true) {
        this._withCalc = value;
        return this;
    }

    withStateView (value = true) {
        this._withStateView = value;
        return this;
    }

    copyParams (query) {
        this._withAttrTitle = query._withAttrTitle;
        this._withCalc = query._withCalc;
        this._withRelated = query._withRelated;
        this._withStateView = query._withStateView;
        this._withTitle = query._withTitle;
        this._maxRelatedDepth = query._maxRelatedDepth;
        this._relatedFilter = query._relatedFilter;
        this.controller = query.controller;
        this.master = query.master;
        this.module = query.module;
        this.user = query.user;
        return this;
    }

    // POPULATE

    async populate (docs) {
        if (docs.length === 0) {
            return docs;
        }
        if (this._customOrder) {
            MetaHelper.sortDocsByMap(docs, this._customOrder, this.view.getKey());
        }
        if (this._raw) {
            return super.populate(docs);
        }
        const models = [];
        const params = {
            controller: this.controller,
            module: this.module,
            security: this.security,
            user: this.user
        };
        for (const doc of docs) {
            const model = this._withStateView
                ? this.view.createModelByState(doc, params)
                : this.view.createModelByData(doc, params);
            model.populate(doc);
            model.related.depth = this._relatedDepth;
            models.push(model);
        }
        if (this.view.behaviors.afterPopulateItems.length) {
            await this.executeAfterPopulateBehaviors(models);
        }
        if (this._withStateView) {
            this.view = models[0].view; // model view resolved by state
        }
        if (this.view.eagerEmbeddedModels.length) {
            await this.resolveEmbeddedModels(models);
        }
        if (this._withRelated && this._relatedDepth < this._maxRelatedDepth) {
            await this.resolveRelation(models);
        }
        if (this._with) {
            await this.resolveWith(models);
        }
        if (this._withCalc && this.view.calcAttrs.length) {
            await this.resolveCalc(models);
        }
        if (this._withAttrTitle) {
            await this.resolveAttrTitle(models);
        }
        if (this._withTitle) {
            await this.resolveTitle(models);
        }
        if (this.security) {
            await this.security.resolveForbiddenReadAttrs(models, this.view);
        }
        if (this.view.behaviors.afterFindItems.length) {
            await this.executeAfterFindBehaviors(models);
        }
        return this._index ? this.indexModels(models) : models;
    }

    async resolveRelation (models) {
        for (const attr of this.view.eagerAttrs) {
            if (this._relatedDepth === 0) {
                this._maxRelatedDepth = attr.eagerDepth;
            }
            const query = attr.eagerView.createQuery().copyParams(this);
            await attr.relation.setRelatedToAll(query, models);
        }
    }

    async resolveWith (models) {
        for (const name of Object.keys(this._with)) {
            const value = this._with[name];
            if (!value) {
                continue;
            }
            const attr = this.view.getAttr(name);
            const view = value.view === true
                ? attr.eagerView
                : value.view
                    ? attr.getRefClass().getView(value.view)
                    : attr.getRefClass();
            const query = view.createQuery().copyParams(this);
            if (value.handler) {
                value.handler(query);
            }
            await attr.relation.setRelatedToAll(query, models);
        }
    }

    async resolveCalc (models) {
        for (const attr of this.view.calcAttrs) {
            for (const model of models) {
                model.set(attr, await attr.calc.resolve(model));
            }
        }
    }

    resolveAttrTitle (models) {
        for (const attr of this.view.headerAttrs) {
            for (const model of models) {
                model.header.resolveAttr(attr);
            }
        }
    }

    resolveTitle (models) {
        if (this.view.header) {
            for (const model of models) {
                model.header.resolve();
            }
        }
    }

    async resolveEmbeddedModels (models) {
        for (const attrs of this.view.eagerEmbeddedModels) {
            const values = MetaHelper.getModelsValues(models, attrs);
            if (values.length) {
                const data = await attrs[0].embeddedModel.findById(values).indexByKey().all();
                for (const model of models) {
                    MetaHelper.setModelRelated(data, model, attrs);
                }
            }
        }
    }

    indexModels (models) {
        const result = {};
        for (const model of models) {
            result[model.get(this._index)] = model;
        }
        return result;
    }

    filterRelatedModels () {
        return this._relatedFilter?.(this);
    }

    async executeAfterPopulateBehaviors (models) {
        for (const model of models) {
            await Behavior.execute('afterPopulate', model);
        }
    }

    async executeAfterFindBehaviors (models) {
        for (const model of models) {
            await Behavior.execute('afterFind', model);
        }
    }

    // PREPARE

    async prepare () {
        if (this.prepared) {
            return;
        }
        await this.view.resolveFilter(this);
        if (Array.isArray(this._afterPrepareHandlers)) {
            for (const handler of this._afterPrepareHandlers) {
                await handler(this);
            }
        }
        this.prepared = true;
    }

    addAfterPrepare (handler) {
        ObjectHelper.push(handler, '_afterPrepareHandlers', this);
        return this;
    }
};

const ObjectHelper = require('areto/helper/ObjectHelper');
const MetaHelper = require('../helper/MetaHelper');
const Behavior = require('../behavior/Behavior');