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
        return Object.hasOwn(this._data, attr.name || attr);
    }

    get (attr) {
        if (this.has(attr)) {
            return this._data[attr.name || attr];
        }
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
            if (Array.isArray(value)) {
                result.push(...value);
            } else if (value) {
                result.push(value);
            }
        }
        return result;
    }

    getTitle (attr) {
        const value = this.get(attr);
        if (Array.isArray(value)) {
            return value.map(model => model.getTitle());
        }
        return value
            ? value.getTitle()
            : this.model.get(attr);
    }

    resolve (attr) {
        return this.has(attr)
            ? this._data[attr.name || attr]
            : this.forceResolve(attr);
    }

    async forceResolve (attr) {
        attr = this.resolveRelationAttr(attr);
        const query = await this.createQuery(attr);
        query.withReadData();
        const result = attr.relation.multiple
            ? await query.all()
            : await query.one();
        this.set(attr, result);
        return result;
    }

    createQuery (attr, view) {
        attr = this.resolveRelationAttr(attr);
        const query = (view || attr.eagerView).createQuery(this.getQueryConfig());
        return attr.relation.setQueryByModel(query, this.model);
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

    async resolveEagers () {
        for (const attr of this.model.view.eagerAttrs) {
            await this.resolve(attr);
        }
    }

    async resolveEmbeddedModels () {
        for (const attrs of this.model.view.eagerEmbeddedModels) {
            const values = MetaHelper.getModelValues(this.model, attrs);
            if (values.length) {
                const query = attrs[0].embeddedModel.findById(values);
                const data = await query.indexByKey().all();
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

    async onBeforeDeleteModel () {
        await this.checkLockedRelations();
    }

    async checkLockedRelations () {
        const {locks} = this.model.class.getRelationAttrsOnDelete();
        for (const attr of locks) {
            const link = await this.findLinkedModels(attr).id();
            if (link) {
                throw new LockedLinkedObject(this.model, link, attr);
            }
        }
    }

    async onAfterDeleteModel () {
        await this.updateRelationsOnDelete();
        await this.deleteOrders();
    }

    async updateRelationsOnDelete () {
        const {nulls, cascades} = this.model.class.getRelationAttrsOnDelete();
        for (const attr of nulls) {
            await this.nullRelated(attr);
        }
        for (const attr of cascades) {
            await this.deleteRelated(attr);
        }
    }

    async deleteRelated (attr) {
        const models = await this.findLinkedModels(attr).all();
        await this.model.constructor.delete(models);
    }

    findLinkedModels ({view, relation}) {
        return view.createQuery(this.getQueryConfig()).and({
            [relation.linkAttrName]: this.model.get(relation.refAttrName)
        });
    }

    // CHANGES

    getChanges (attr) {
        attr = attr.name || attr;
        return Object.hasOwn(this._changes, attr)
            ? this._changes[attr]
            : null;
    }

    serializeChanges (attr) {
        const changes = this.getChanges(attr);
        if (!changes) {
            return null;
        }
        const result = {};
        for (const key of Object.keys(changes)) {
            if (changes[key].length) {
                result[key] = changes[key].map(item => {
                    return item instanceof Model ? item.getId() : item;
                });
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

    async resolveSingleBackRefUnlink (attr, {links, unlinks, deletes}) {
        if (attr.relation.multiple || attr.isRef()) {
            return false;
        }
        if (!links.length || unlinks.length || deletes.length) {
            return false;
        }
        const model = await this.resolve(attr);
        if (model) {
            attr.commandMap.delete && !attr.commandMap.remove
                ? deletes.push(model)
                : unlinks.push(model);
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
            const query = view.createQuery(this.getQueryConfig()).byId(changes.links);
            changes.links = await query.all();
        }
    }

    async resolveByRelated (key, changes, view, attr) {
        if (changes[key].length) {
            const query = view.createQuery(this.getQueryConfig()).byId(changes[key]);
            await attr.relation.setQueryByModel(query, this.model);
            changes[key] = await query.all();
        }
    }

    getSingleRef (attr, {links, unlinks, deletes}) {
        if (links.length) {
            return links[0].get(attr.relation.refAttrName);
        }
        if (unlinks.length > 0 || deletes.length > 0) {
            return null;
        }
        return this.model.get(attr);
    }

    getMultipleRef (attr, {links, unlinks, deletes}) {
        let value = this.model.get(attr);
        if (!Array.isArray(value)) {
            value = [];
        }
        const key = attr.relation.refAttrName;
        if (unlinks.length) {
            unlinks = unlinks.map(model => model.get(key));
            value = MongoHelper.exclude(unlinks, value);
        }
        if (deletes.length) {
            deletes = deletes.map(model => model.get(key));
            value = MongoHelper.exclude(deletes, value);
        }
        if (links.length) {
            links = links.map(model => model.get(key));
            if (value.length) {
                links = MongoHelper.exclude(value, links);
            }
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

    async changeRelationBackRef ({relation}, data) {
        for (const model of data.links) {
            model.related.setResolvedChanges(relation.refAttr, {
                links: [this.model]
            });
            await model.update();
        }
        for (const model of data.unlinks) {
            model.related.setResolvedChanges(relation.refAttr, {
                unlinks: [this.model]
            });
            await model.update();
        }
    }

    async changeBackRef ({relation}, data) {
        for (const model of data.links) {
            const value = this.model.get(relation.linkAttrName);
            model.set(relation.refAttrName, value);
            await model.update();
        }
        for (const model of data.unlinks) {
            model.set(relation.refAttrName, null);
            await model.update();
        }
    }

    setResolvedChanges (attr, data) {
        if (!data.links) {
            data.links = [];
        }
        if (!data.unlinks) {
            data.unlinks = [];
        }
        if (!data.deletes) {
            data.deletes = [];
        }
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

    async checkRefExist ({linkAttrName, refAttrName}, doc) {
        const query = this.model.class.find({[linkAttrName]: doc[refAttrName]});
        const key = this.model.class.getKey();
        const ids = await query.limit(2).column(key);
        return this.isExistingId(this.model.getId(), ids);
    }

    checkBackRefExist ({linkAttrName, refAttrName, refClass}, item) {
        const link = this.model.get(linkAttrName);
        const query = refClass.find({[refAttrName]: link});
        const key = refClass.getKey();
        const ids = query.limit(2).column(key);
        return this.isExistingId(item[refAttrName], ids);
    }

    isExistingId (id, ids) {
        return ids.length === 1
            ? !CommonHelper.isEqual(id, ids[0])
            : ids.length > 1;
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

    async getLinkedDocs ({name, relation}) {
        if (Object.hasOwn(this._linkedMap, name)) {
            return this._linkedMap[name];
        }
        const query = relation.refClass.createQuery(this.getQueryConfig());
        await relation.setQueryByModel(query, this.model);
        const items = await query.raw().all();
        const data = this._changes[name];
        const result = {};
        const refKey = relation.refClass.getKey();
        for (const item of items) {
            result[item[refKey]] = item;
        }
        if (data) {
            for (const model of data.links) {
                result[model.getId()] = model.getValues();
            }
            const models = data.unlinks.concat(data.deletes);
            for (const model of models) {
                delete result[model.getId()];
            }
        }
        return this._linkedMap[name] = Object.values(result);
    }

    // ORDER

    getOrderKey (attr) {
        return `${this.model.class.RELATION_ORDER_PREFIX}${this.model.getId()}_${attr.name || attr}`;
    }

    async updateOrder (attr, data) {
        const {refClass} = attr.relation;
        const refKey = refClass.getKey();
        const query = refClass.createQuery();
        const db = query.getDb();
        const table = query.getTable();
        const values = this.model.getValues();
        await attr.relation.setQueryByDoc(query, values);
        const orderKey = this.getOrderKey(attr);
        const items = await query.select([refKey, orderKey]).raw().all();
        for (const item of items) {
            const pos = data.indexOf(String(item[refKey]));
            if (pos !== item[orderKey]) {
                await db.update(table, {[refKey]: item[refKey]}, {[orderKey]: pos});
            }
        }
        let names = this.model.getSortedRelationNames();
        if (!Array.isArray(names)) {
            names = [];
        }
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
        if (Array.isArray(names)) {
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
        const table = refClass.getTable();
        const key = this.getOrderKey(attr);
        return refClass.getDb().unsetAll(table, {}, {[key]: true});
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const LockedLinkedObject = require('../error/LockedLinkedObject');
const MongoHelper = require('areto/helper/MongoHelper');
const MetaHelper = require('../helper/MetaHelper');
const Model = require('./Model');