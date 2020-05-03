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
        this._where = this.view.class.filter;
        this._order = this.view.order;
        this._raw = null;
        this._relatedDepth = 0;
        this._maxRelatedDepth = 1;
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

    withListData (value = true) {
        this._withAttrTitle = value;
        this._withCalc = value;
        this._withRelated = value;
        return this;
    }

    withFormData (value = true) {
        this._withCalc = value;
        this._withReadOnlyTitle = value;
        this._withRelated = value;
        this._withState = value;
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

    withReadOnlyTitle (value = true) {
        this._withReadOnlyTitle = value;
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

    withState (value = true) {
        this._withState = value;
        return this;
    }

    copyParams (query) {
        this._withAttrTitle = query._withAttrTitle;
        this._withCalc = query._withCalc;
        this._withReadOnlyTitle = query._withReadOnlyTitle;
        this._withRelated = query._withRelated;
        this._withState = query._withState;
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
            user: this.user
        };
        for (const doc of docs) {
            const model = this._withState
                ? this.view.createModelByState(doc, params)
                : this.view.createModel(doc, params);
            model.populate(doc);
            model.related.depth = this._relatedDepth;
            models.push(model);
        }
        if (this._withState) {
            this.view = models[0].view; // resolved by state
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
        if (this._withReadOnlyTitle && !this._withAttrTitle) {
            await this.resolveReadOnlyTitle(models);
        }
        if (this._withTitle) {
            await this.resolveTitle(models);
        }
        if (this.view.eagerUserAttrs.length) {
            await this.resolveUsers(models);
        }
        if (this.security) {
            await this.security.resolveForbiddenReadAttrs(models, this.view);
        }
        if (this.view.afterFindBehaviors) {
            await this.executeAfterFindBehaviors(models);
        }
        return this._index ? this.indexModels(models) : models;
    }

    async resolveRelation (models) {
        for (const attr of this.view.eagerAttrs) {
            if (this._relatedDepth === 0) {
                this._maxRelatedDepth = attr.eagerDepth;
            }
            const query = attr.getEagerView().find().copyParams(this);
            await attr.relation.findByModels(models, query);
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
                ? attr.getEagerView()
                : value.view
                    ? attr.getRefClass().getView(value.view)
                    : attr.getRefClass();
            const query = view.find().copyParams(this);
            if (value.handler) {
                value.handler(query);
            }
            await attr.relation.findByModels(models, query);
        }
    }

    async resolveCalc (models) {
        for (const attr of this.view.calcAttrs) {
            await attr.calc.resolveAll(models);
        }
    }

    resolveAttrTitle (models) {
        for (const attr of this.view.headerAttrs) {
            attr.header.resolveAll(models);
        }
    }

    resolveReadOnlyTitle (models) {
        for (const attr of this.view.headerAttrs) {
            if (attr.isReadOnly()) {
                attr.header.resolveAll(models);
            }
        }
    }

    resolveTitle (models) {
        if (this.view.header) {
            return this.view.header.resolveAll(models);
        }
    }

    async resolveUsers (models) {
        const ids = MetaHelper.getModelValues(models, this.view.eagerUserAttrs);
        if (ids.length) {
            const user = this.view.meta.spawnUser();
            const userMap = await user.findById(ids).indexByKey().all();
            MetaHelper.setModelRelated(userMap, models, this.view.eagerUserAttrs);
        }
    }

    indexModels (models) {
        const result = {};
        for (const model of models) {
            result[model.get(this._index)] = model;
        }
        return result;
    }

    filterRelated () {
        return this._relatedFilter && this._relatedFilter(this);
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