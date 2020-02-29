/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Relation extends Base {

    constructor (config) {
        super(config);
        this.data = this.attr.data;
        this.refClass = this.attr.class.meta.getClass(this.data.refClass);
        if (!this.refClass) {
            return this.attr.log('error', `Invalid reference class: ${this.data.refClass}`);
        }
        this.refAttrName = this.data.refAttr || this.refClass.getKey();
        this.refAttr = this.refClass.getAttr(this.refAttrName);
        this.linkAttrName = this.resolveLinkAttrName();
        this.linkAttr = this.attr.class.getAttr(this.linkAttrName);
        this.multiple = this.data.multiple === true;
        this.via = this.data.via;
        this.onUpdate = this.data.onUpdate;
        this.onDelete = this.data.onDelete;
        this.createFinder();
    }

    isBackRef () {
        return this.attr.isBackRef();
    }

    isRef () {
        return this.attr.isRef();
    }

    isSortable () {
        return this.data.sortableRelation;
    }

    getRefAttrType () {
        return this.refAttr ? this.refAttr.getType() : this.refClass.key.type;
    }

    getLinkAttrType () {
        return this.linkAttr ? this.linkAttr.getType() : this.attr.class.key.type;
    }

    createFinder () {
        this.finder = RelationFinder.create(this.data.finder, this);
    }

    resolveLinkAttrName () {
        if (this.data.linkAttr) {
            return this.data.linkAttr;
        }
        if (this.attr.isRef()) {
            return this.attr.name;
        }
        return this.refAttr && this.refAttr.data && this.refAttr.data.refAttr
            ? this.refAttr.data.refAttr
            : this.refClass.getKey();
    }

    findByRefAttr (value) {
        value = TypeHelper.cast(value, this.getRefAttrType());
        return this.refClass.find().and({[this.refAttrName]: value});
    }

    setQueryByModel (query, model) {
        if (model.hasRelationOrder(this.attr)) {
            query.order({[model.related.getOrderKey(this.attr)]: 1});
        }
        return this.finder
            ? this.finder.execute(query, model)
            : this.setQueryByDoc(query, model.getValues());
    }

    async setQueryByDoc (query, doc) {
        let value = doc[this.linkAttrName];
        if (!doc.hasOwnProperty(this.linkAttrName) || value === undefined || value === null || value.length === 0) {
            return query.and(['FALSE']);
        }
        if (this.via) {
            value = await this.resolveVia(this.via, value);
        }
        return query.and({[this.refAttrName]: value});
    }

    async resolveVia (via, value) {
        const viaClass = this.refClass.meta.getClass(via.refClass);
        const viaAttrName = via.refAttr || viaClass.getKey();
        const viaLinkAttrName = via.linkAttr || viaClass.getKey();
        const values = await viaClass.find().and({[viaAttrName]: value}).column(viaLinkAttrName);
        return via.via ? this.resolveVia(via.via, values) : values;
    }

    // MANY DOCS

    async findByModels (models, query) {
        if (models.length === 0) {
            return [];
        }
        const model = models[0];
        const buckets = await this.setQueryByModels(query, models);
        query.setRelatedDepth(model.related.depth + 1);
        await query.filterRelated();
        const relatedModels = await query.all();
        this.assignRelatedModels(models, relatedModels, buckets, query.security);
        return relatedModels;
    }

    async setQueryByModels (query, models) {
        const buckets = MetaHelper.createBuckets(models, this.linkAttrName);
        if (this.via) {
            await this.resolveViaBuckets(this.via, buckets);
        }
        query.and({[this.refAttrName]: buckets.values});
        return buckets;
    }

    async resolveViaBuckets (via, buckets) {
        const viaClass = this.refClass.meta.getClass(via.refClass);
        const viaAttrName = via.refAttr || viaClass.getKey();
        const viaLinkAttrName = via.linkAttr || viaClass.getKey();
        const query = viaClass.find().raw().and({[viaAttrName]: buckets.values});
        const docs = await query.select({
            [viaAttrName]: 1,
            [viaLinkAttrName]: 1
        }).all();
        MetaHelper.rebuildBuckets(buckets, docs, viaLinkAttrName, viaAttrName);
        if (via.via) {
            await this.resolveViaBuckets(via.via, buckets);
        }
    }

    assignRelatedModels (models, relatedModels, buckets, security) {
        for (const model of models) {
            model.related.set(this.attr, this.multiple ? [] : null);
        }
        for (const relatedModel of relatedModels) {
            let keys = relatedModel.get(this.refAttrName);
            keys = Array.isArray(keys) ? keys : [keys];
            for (const key of keys) {
                if (Array.isArray(buckets.models[key])) {
                    for (const model of buckets.models[key]) {
                        this.multiple
                            ? model.related.push(this.attr, relatedModel)
                            : model.related.set(this.attr, relatedModel);
                    }
                }
            }
            relatedModel.security = security;
        }
        if (this.multiple && this.isSortable()) {
            for (const model of models) {
                if (model.hasRelationOrder(this.attr)) {
                    const key = model.related.getOrderKey(this.attr);
                    model.related.get(this.attr).sort((a, b) => a.get(key) - b.get(key));
                }
            }
        }
    }

    getRelatedModels (models) {
        const data = {};
        for (const model of models) {
            const related = model.related.get(this.attr);
            if (Array.isArray(related)) {
                for (const item of related) {
                    data[item.getId()] = item;
                }
            } else if (related) {
                data[related.getId()] = related;
            }
        }
        return Object.values(data);
    }
};

const MetaHelper = require('../helper/MetaHelper');
const TypeHelper = require('../helper/TypeHelper');
const RelationFinder = require('./RelationFinder');