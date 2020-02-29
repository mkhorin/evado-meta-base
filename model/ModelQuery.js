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
        this._order = this.view.getOrder();
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

    withListData (value = true) {
        this._withAttrTitle = value;
        this._withCalc = value;
        this._withRelated = value;
        this._withUsers = value;
        return this;
    }

    withFormData (value = true) {
        this._withCalc = value;
        this._withReadOnlyTitle = value;
        this._withRelated = value;
        this._withState = value;
        this._withTitle = value;
        this._withUsers = value;
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

    withUsers (value = true) {
        this._withUsers = value;
        return this;
    }

    copyParams (query) {
        this._withAttrTitle = query._withAttrTitle;
        this._withCalc = query._withCalc;
        this._withReadOnlyTitle = query._withReadOnlyTitle;
        this._withRelated = query._withRelated;
        this._withState = query._withState;
        this._withTitle = query._withTitle;
        this._withUsers = query._withUsers;
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
        if (this._withUsers && this.view.userAttrs.length) {
            await this.resolveUsers(models);
        }
        if (this.security) {
            await this.security.resolveReadForbiddenAttrs(models, this.view);
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

    async resolveCalc (models) {
        for (const attr of this.view.calcAttrs) {
            await attr.calc.resolve(models);
        }
    }

    resolveAttrTitle (models) {
        for (const attr of this.view.headerAttrs) {
            attr.header.resolveModels(models);
        }
    }

    resolveReadOnlyTitle (models) {
        for (const attr of this.view.headerAttrs) {
            if (attr.isReadOnly()) {
                attr.header.resolveModels(models);
            }
        }
    }

    resolveTitle (models) {
        if (this.view.header) {
            return this.view.header.resolveModels(models);
        }
    }

    async resolveUsers (models) {
        const ids = MetaHelper.getModelValueList(models, this.view.userAttrs);
        if (ids.length) {
            const user = this.view.meta.spawnUser();
            const userMap = await user.findById(ids).indexById().all();
            MetaHelper.setModelRelated(userMap, models, this.view.userAttrs);
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