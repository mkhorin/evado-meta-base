/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ModelRelated extends Base {

    constructor (config) {
        super(config);
        this.depth = 0;
        this._changes = {};
        this._deletes = {};
        this._data = {};
        this._linkedMap = {};
    }

    has (attr) {
        return Object.prototype.hasOwnProperty.call(this._data, attr.name || attr);
    }

    get (attr) {
        return this.has(attr) ? this._data[attr.name || attr] : undefined;
    }

    set (attr, value) {
        this._data[attr.name || attr] = value;
    }

    unset (attr) {
        delete this._data[attr.name || attr];
    }

    push (attr, value) {
        this._data[attr.name || attr].push(value);
    }

    async getNestedData (key) {
        const index = key.indexOf('.');
        if (index === -1) {
            return this.has(key) ? this._data[key] : this.forceResolve(key);
        }
        const data = await this.resolve(key.substring(0, index));
        key = key.substring(index + 1);
        if (!Array.isArray(data)) {
            return data ? data.related.getNestedData(key) : null;
        }
        const result = [];
        for (const model of data) {
            const value = await model.related.getNestedData(key);
            Array.isArray(value) ? result.push(...value) : value ? result.push(value) : false;
        }
        return result;
    }

    getTitle (attr) {
        const value = this.get(attr);
        return Array.isArray(value)
            ? value.map(model => model.getTitle())
            : value ? value.getTitle() : this.model.get(attr);
    }

    getQueryConfig () {
        return {
            controller: this.model.controller,
            dependency: this.model.getValues(),
            model: this.model,
            module: this.model.module,
            user: this.model.user
        };
    }

    getRelation (attr, view) {
        attr = this.resolveRelationAttr(attr);
        view = view || attr.eagerView;
        const query = view.createQuery(this.getQueryConfig()).withReadData();
        return attr.relation.setQueryByModel(query, this.model);
    }

    resolve (attr) {
        return this.has(attr)
            ? this._data[attr.name || attr]
            : this.forceResolve(attr);
    }

    async forceResolve (attr) {
        attr = this.resolveRelationAttr(attr);
        const query = await this.getRelationQuery(attr);
        const models = await query.withReadData().all();
        const result = attr.relation.multiple ? models : models[0];
        this.set(attr, result);
        return result;
    }

    resolveRelationAttr (name) {
        const attr = this.model.view.resolveAttr(name);
        if (!attr) {
            throw new Error(`Attribute not found: ${name}.${this.model.class.id}`);
        }
        if (!attr.relation) {
            throw new Error(`Not relation attribute: ${attr.id}`);
        }
        return attr;
    }

    getRelationQuery (attr) {
        const query = attr.eagerView.createQuery(this.getQueryConfig());
        return attr.relation.setQueryByModel(query, this.model);
    }

    async resolveEagers () {
        for (const attr of this.model.view.eagerAttrs) {
            await this.resolve(attr);
        }
    }

    async resolveEmbeddedModels () {
        for (const attrs of this.model.view.eagerEmbeddedModels) {
            const values = MetaHelper.getModelValues(this.model, attrs);
            if (values.length) {
                const data = await attrs[0].embeddedModel.findById(values).indexByKey().all();
                MetaHelper.setModelRelated(data, this.model, attrs);
            }
        }
    }

    async onUpdateModel () {
        const attrs = this.model.class.getRelationAttrsOnUpdate();
        attrs.nulls = attrs.nulls.filter(this.model.isValueChanged, this.model);
        attrs.cascades = attrs.cascades.filter(this.model.isValueChanged, this.model);
        for (const attr of attrs.nulls) {
            await this.nullRelated(attr);
        }
        for (const attr of attrs.cascades) {
            await this.updateRelated(attr);
        }
    }

    nullRelated (attr) {
        const {multiple, refAttrName, linkAttrName} = attr.relation;
        const value = this.model.getOldValue(refAttrName);
        return multiple // delete from array
            ? attr.class.updateAllPull({}, {[linkAttrName]: value})
            : attr.class.updateAll({[linkAttrName]: value}, {[linkAttrName]: null});
    }

    async updateRelated (attr) {
        const {multiple, refAttrName, linkAttrName} = attr.relation;
        const value = this.model.get(refAttrName);
        const oldValue = this.model.getOldValue(refAttrName);
        if (multiple) {
            await attr.class.updateAllPush({[linkAttrName]: oldValue}, {[linkAttrName]: value});
            await attr.class.updateAllPull({}, {[linkAttrName]: oldValue});
        } else {
            await attr.class.updateAll({[linkAttrName]: oldValue}, {[linkAttrName]: value});
        }
    }

    async onDeleteModel () {
        const {nulls, cascades} = this.model.class.getRelationAttrsOnDelete();
        for (const attr of nulls) {
            await this.nullRelated(attr);
        }
        for (const attr of cascades) {
            await this.deleteRelated(attr);
        }
        return this.deleteOrders();
    }

    async deleteRelated (attr) {
        const query = attr.view.createQuery(this.getQueryConfig());
        const value = this.model.get(attr.relation.refAttrName);
        const models = await query.and({[attr.relation.linkAttrName]: value}).all();
        return this.model.constructor.delete(models);
    }

    // CHANGES

    getChanges (attr) {
        attr = attr.name || attr;
        return this._changes.hasOwnProperty(attr) ? this._changes[attr] : null;
    }

    serializeChanges (attr) {
        const changes = this.getChanges(attr);
        if (!changes) {
            return null;
        }
        const result = {};
        for (const key of Object.keys(changes)) {
            if (changes[key].length) {
                result[key] = changes[key].map(item => item instanceof Model ? item.getId() : item);
            }
        }
        return result;
    }

    setChanges (attr, data) {
        data = CommonHelper.parseRelationChanges(data);
        this._changes[attr.name || attr] = data;
        this._resolved = false;
    }

    unsetChanges (attr) {
        delete this._changes[attr.name || attr];
    }

    async resolveChanges () {
        if (this._resolved || !this._changes) {
            return null;
        }
        this._resolved = true;
        for (const name of Object.keys(this._changes)) {
            const data = this._changes[name];
            if (data) {
                const attr = this.model.view.getAttr(name);
                const view = attr.getSelectListView();
                this.filterAttrChanges(attr, data);
                await this.resolveLinks(data, view);
                await this.resolveByRelated('unlinks', data, view.class, attr);
                await this.resolveByRelated('deletes', data, view.class, attr);
                await this.resolveSingleBackRefUnlink(attr, data);
                this.resolveRefAttr(attr, data);
            }
        }
    }

    filterAttrChanges (attr, data) {
        const commands = attr.commandMap;
        if (data.links.length && commands.add !== true && commands.create !== true) {
            data.links = [];
        }
        if (data.unlinks.length && commands.remove !== true) {
            data.unlinks = [];
        }
        if (data.deletes.length && commands.delete !== true) {
            data.deletes = [];
        }
    }

    async resolveSingleBackRefUnlink (attr, data) {
        if (attr.relation.multiple || attr.isRef() || !data.links.length || data.unlinks.length || data.deletes.length) {
            return false;
        }
        const model = await this.resolve(attr);
        if (model) {
            attr.commandMap.delete && !attr.commandMap.remove
                ? data.deletes.push(model)
                : data.unlinks.push(model);
        }
    }

    resolveRefAttr (attr, data) {
        if (attr.isRef()) {
            this.model.set(attr, attr.relation.multiple
                ? this.getMultipleRef(attr, data)
                : this.getSingleRef(attr, data));
        }
    }

    async resolveLinks (changes, view) {
        if (changes.links.length) {
            changes.links = await view.createQuery(this.getQueryConfig()).byId(changes.links).all();
        }
    }

    async resolveByRelated (key, changes, view, attr) {
        if (changes[key].length) {
            const query = view.createQuery(this.getQueryConfig()).byId(changes[key]);
            await attr.relation.setQueryByModel(query, this.model);
            changes[key] = await query.all();
        }
    }

    getSingleRef (attr, data) {
        if (data.links.length) {
            return data.links[0].get(attr.relation.refAttrName);
        }
        if (data.unlinks.length > 0 || data.deletes.length > 0) {
            return null;
        }
        return this.model.get(attr);
    }

    getMultipleRef (attr, data) {
        let key = attr.relation.refAttrName;
        let value = this.model.get(attr);
        value = Array.isArray(value) ? value : [];
        if (data.unlinks.length) {
            value = MongoHelper.exclude(data.unlinks.map(model => model.get(key)), value);
        }
        if (data.deletes.length) {
            value = MongoHelper.exclude(data.deletes.map(model => model.get(key)), value);
        }
        if (data.links.length) {
            let links = data.links.map(model => model.get(key));
            links = value.length ? MongoHelper.exclude(value, links) : links;
            if (links.length) {
                value = value.concat(links); // concat to update value array
            }
        }
        return value;
    }

    async changeBackRefs () {
        for (const attr of this.model.view.backRefAttrs) {
            const data = this.getChanges(attr);
            if (data) {
                attr.relation.refAttr?.relation
                    ? await this.changeRelationBackRef(attr, data) // backref to reference attr
                    : await this.changeBackRef(attr, data); // backref to simple attr
            }
        }
    }

    async changeRelationBackRef (attr, data) {
        for (const model of data.links) {
            model.related.setResolvedChanges(attr.relation.refAttr, {links: [this.model]});
            await model.update();
        }
        for (const model of data.unlinks) {
            model.related.setResolvedChanges(attr.relation.refAttr, {unlinks: [this.model]});
            await model.update();
        }
    }

    async changeBackRef (attr, data) {
        for (const model of data.links) {
            model.set(attr.relation.refAttrName, this.model.get(attr.relation.linkAttrName));
            await model.update();
        }
        for (const model of data.unlinks) {
            model.set(attr.relation.refAttrName, null);
            await model.update();
        }
    }

    setResolvedChanges (attr, data) {
        data.links = data.links || [];
        data.unlinks = data.unlinks || [];
        data.deletes = data.deletes || [];
        this._changes[attr.name] = data;
        this.resolveRefAttr(attr, data);
        this._resolved = true;
    }

    getDeletedModels () {
        const models = [];
        for (const name of Object.keys(this._changes)) {
            const data = this._changes[name];
            if (data) {
                models.push(...data.deletes);
            }
        }
        return models;
    }

    // EXISTS

    async checkExists (attr) {
        if (attr.relation.multiple) {
            throw new Error(`Multiple relation to exist: ${attr.name}`);
        }
        const docs = await this.getLinkedDocs(attr);
        if (docs.length === 0) {
            return;
        }
        if (docs.length !== 1) {
            throw new Error('Invalid relation changes');
        }
        return attr.isBackRef()
            ? this.checkBackRefExist(attr.relation, docs[0])
            : this.checkRefExist(attr.relation, docs[0]);
    }

    async checkRefExist (relation, doc) {
        const query = this.model.class.find({
            [relation.linkAttrName]: doc[relation.refAttrName]
        });
        const ids = await query.limit(2).column(this.model.class.getKey());
        return this.isExistingId(this.model.getId(), ids);
    }

    checkBackRefExist (relation, item) {
        const query = relation.refClass.find({
            [relation.refAttrName]: this.model.get(relation.linkAttrName)
        });
        const ids = query.limit(2).column(relation.refClass.getKey());
        return this.isExistingId(item[relation.refAttrName], ids);
    }

    isExistingId (id, ids) {
        return ids.length === 1 ? !CommonHelper.isEqual(id, ids[0]) : ids.length > 1;
    }

    assignToModelValues () {
        for (const name of Object.keys(this._data)) {
            const value = this._data[name];
            if (Array.isArray(value)) {
                const result = [];
                for (const model of value) {
                    model.related.assignToModelValues();
                    result.push(model.getValues());
                }
                this.model.set(name, result);
            } else if (value) {
                value.related.assignToModelValues();
                this.model.set(name, value.getValues());
            } else {
                this.model.set(name, null);
            }
        }
    }

    async getLinkedDocs (attr) {
        if (this._linkedMap.hasOwnProperty(attr.name)) {
            return this._linkedMap[attr.name];
        }
        const query = attr.relation.refClass.createQuery(this.getQueryConfig());
        await attr.relation.setQueryByModel(query, this.model);
        const items = await query.raw().all();
        const data = this._changes[attr.name];
        const result = {};
        const refKey = attr.relation.refClass.getKey();
        for (const item of items) {
            result[item[refKey]] = item;
        }
        if (data) {
            for (const model of data.links) {
                result[model.getId()] = model.getValues();
            }
            for (const model of data.unlinks.concat(data.deletes)) {
                delete result[model.getId()];
            }
        }
        return this._linkedMap[attr.name] = Object.values(result);
    }

    // ORDER

    getOrderKey (attr) {
        return `${this.model.class.RELATION_ORDER_PREFIX}${this.model.getId()}_${attr.name || attr}`;
    }

    async updateOrder (attr, data) {
        const refClass = attr.relation.refClass;
        const refKey = refClass.getKey();
        const query = refClass.createQuery();
        await attr.relation.setQueryByDoc(query, this.model.getValues());
        const orderKey = this.getOrderKey(attr);
        const items = await query.select([refKey, orderKey]).raw().all();
        for (const item of items) {
            const pos = data.indexOf(String(item[refKey]));
            if (pos !== item[orderKey]) {
                await query.getDb().update(query.getTable(), {[refKey]: item[refKey]}, {[orderKey]: pos});
            }
        }
        let names = this.model.getSortedRelationNames();
        names = Array.isArray(names) ? names : [];
        if (!names.includes(attr.name)) {
            names.push(attr.name);
            await this.model.class.update(this.model.getId(), {
                [refClass.RELATION_SORTED_ATTR]: names
            });
        }
    }

    async deleteOrder (attr) {
        await this.unsetOrderField(attr.relation.refClass, attr);
        const names = this.model.getSortedRelationNames();
        if (names) {
            ArrayHelper.remove(attr.name, names);
            await this.model.class.update(this.model.getId(), {
                [this.model.class.RELATION_SORTED_ATTR]: names
            });
        }
    }

    async deleteOrders () {
        const names = this.model.getSortedRelationNames();
        if (Array.isArray(names)) {
            for (const name of names) {
                const attr = this.model.class.getAttr(name);
                if (attr?.relation) {
                    await this.unsetOrderField(attr.relation.refClass, attr);
                }
            }
        }
    }

    unsetOrderField (refClass, attr) {
        const key = this.getOrderKey(attr);
        return refClass.getDb().unsetAll(refClass.getTable(), {}, {[key]: true});
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const MongoHelper = require('areto/helper/MongoHelper');
const MetaHelper = require('../helper/MetaHelper');
const Model = require('./Model');