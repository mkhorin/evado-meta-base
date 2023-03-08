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
        this.createFilter();
    }

    isBackRef () {
        return this.attr.isBackRef();
    }

    isRef () {
        return this.attr.isRef();
    }

    isMultiple () {
        return this.multiple;
    }

    isSortable () {
        return this.data.sortableRelation;
    }

    getRefAttrType () {
        return this.refAttr
            ? this.refAttr?.getType()
            : this.refClass.key.type;
    }

    getLinkAttrType () {
        return this.linkAttr
            ? this.linkAttr?.getType()
            : this.attr.class.key.type;
    }

    createFilter () {
        try {
            this.filter = RelationFilter.create(this.data.filter, this);
        } catch (err) {
            this.attr.log('error', 'Create filter failed', err);
        }
    }

    resolveLinkAttrName () {
        if (this.data.linkAttr) {
            return this.data.linkAttr;
        }
        return this.attr.isRef()
            ? this.attr.name
            : this.refAttr?.data?.refAttr || this.refClass.getKey();
    }

    findByRefAttr (value) {
        value = TypeHelper.cast(value, this.getRefAttrType());
        return this.refClass.find({[this.refAttrName]: value});
    }

    setQueryByModel (query, model) {
        if (model.isRelationSorted(this.attr)) {
            const key = model.related.getOrderKey(this.attr);
            query.order({[key]: 1});
        }
        if (!this.multiple) {
            query.limit(1);
        }
        return this.filter
            ? this.filter.apply(query, model)
            : this.setQueryByDoc(query, model.getValues());
    }

    async setQueryByDoc (query, doc) {
        if (!Object.prototype.hasOwnProperty.call(doc, this.linkAttrName)) {
            return query.and(['false']);
        }
        let value = doc[this.linkAttrName];
        if (value === undefined || value === null || value.length === 0) {
            return query.and(['false']);
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
        const query = viaClass.find({[viaAttrName]: value});
        const values = await query.column(viaLinkAttrName);
        return via.via
            ? this.resolveVia(via.via, values)
            : values;
    }

    // MANY DOCS

    async setRelatedToAll (query, models) {
        if (!models.length) {
            return null;
        }
        if (this.filter) {
            return this.filter.applyForAll(query, models);
        }
        const buckets = await this.createBuckets(models);
        query.and({[this.refAttrName]: buckets.values});
        query.setRelatedDepth(models[0].related.depth + 1);
        await query.filterRelatedModels();
        const relatives = await query.all();
        this.assignRelatedModels(models, relatives, buckets);
        this.sortRelatedModels(models);
    }

    createBuckets (models) {
        const buckets = MetaHelper.createBuckets(models, this.linkAttrName);
        return this.via
            ? this.resolveViaBuckets(this.via, buckets)
            : buckets;
    }

    async resolveViaBuckets (via, buckets) {
        const viaClass = this.refClass.meta.getClass(via.refClass);
        const viaAttrName = via.refAttr || viaClass.getKey();
        const viaLinkAttrName = via.linkAttr || viaClass.getKey();
        const query = viaClass.find({[viaAttrName]: buckets.values}).select({
            [viaAttrName]: 1,
            [viaLinkAttrName]: 1
        });
        const docs = await query.raw().all();
        MetaHelper.rebuildBuckets(buckets, docs, viaLinkAttrName, viaAttrName);
        return via.via
            ? this.resolveViaBuckets(via.via, buckets)
            : buckets;
    }

    assignRelatedModels (models, relatives, buckets) {
        for (const model of models) {
            model.related.set(this.attr, this.multiple ? [] : null);
        }
        for (const relative of relatives) {
            let keys = relative.get(this.refAttrName);
            keys = Array.isArray(keys) ? keys : [keys];
            for (const key of keys) {
                if (Array.isArray(buckets.models[key])) {
                    for (const model of buckets.models[key]) {
                        this.multiple
                            ? model.related.push(this.attr, relative)
                            : model.related.set(this.attr, relative);
                    }
                }
            }
        }
    }

    sortRelatedModels (models) {
        if (this.multiple && this.isSortable()) {
            for (const {related} of models) {
                const key = related.getOrderKey(this.attr);
                const relatives = related.get(this.attr);
                relatives.sort((a, b) => a.get(key) - b.get(key));
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
const RelationFilter = require('../filter/RelationFilter');