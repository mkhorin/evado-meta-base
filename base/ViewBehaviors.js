/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ViewBehaviors extends Base {

    static getDefaultBehaviorClasses () {
        return [];
    }

    init () {
        this.createItems();
        this.createDefaultItems();
        this.prepareItems();
        this.appendClassItems();
        this.sortItems();

        this.afterFindItems = this.getAllByMethod('afterFind');
        this.afterPopulateItems = this.getAllByMethod('afterPopulate');

        this.fileItem = this.getByType('file');
        this.historyItem = this.getByType('history');
        this.signatureItem = this.getByType('signature');
    }

    getByType (type) {
        return this.getByClass(Behavior.getBuiltIn(type));
    }

    getByClass (Class) {
        for (const item of this.items) {
            if (item.Class === Class || item.Class.prototype instanceof Class) {
                return item;
            }
        }
    }

    getAllByClassAndAttr (Class, attrName) {
        const result = [];
        for (const item of this.getAllByClass(Class)) {
            if (item.attrName === attrName) {
                result.push(item);
            }
        }
        return result;
    }

    getAllByClass (Class) {
        const result = [];
        for (const item of this.items) {
            if (item.Class === Class || item.Class.prototype instanceof Class) {
                result.push(item);
            }
        }
        return result;
    }

    getAllByMethod (name) {
        const result = [];
        for (const item of this.items) {
            if (typeof item.Class.prototype[name] === 'function') {
                result.push(item);
            }
        }
        return result;
    }

    createItems () {
        const sources = this.getAttrItems();
        if (Array.isArray(this.owner.data.behaviors)) {
            sources.push(...this.owner.data.behaviors);
        }
        this.items = [];
        for (const source of sources) {
            const data = this.createItem(source);
            data ? this.items.push(data)
                 : this.log('error', 'Invalid behavior configuration', source);
        }
    }

    createItem (data) {
        if (!data) {
            return null;
        }
        let orderNumber = data.orderNumber || 0;
        let Class = Behavior.getBuiltIn(data);
        if (Class) {
            return {Class, orderNumber, type: data};
        }
        if (data.type === Behavior.CUSTOM_TYPE) {
            return this.createCustomItem(data);
        }
        Class = Behavior.getBuiltIn(data.type);
        if (Class) {
            return {...data, Class, orderNumber};
        }
    }

    createCustomItem (data) {
        data.config.orderNumber = data.config.orderNumber || data.orderNumber || 0;
        return this.owner.getMeta().resolveSpawn(data.config);
    }

    createDefaultItems () {
        const result = [];
        for (const Class of this.constructor.getDefaultBehaviorClasses()) {
            const item = this.createDefaultItem(Class);
            if (item) {
                result.push(item);
            }
        }
        this.items.push(...result);
    }

    createDefaultItem (Class) {
        if (!this.getByClass(Class)) {
            return Class.getDefaultConfig(this.owner);
        }
    }

    prepareItems () {
        const result = [];
        for (const item of this.items) {
            const data = item.Class.prepareConfig(item, this.owner);
            if (data) {
                result.push(data);
            }
        }
        this.items = result;
    }

    appendClassItems () {
        if (this.owner !== this.owner.class) {
            this.items.push(...this.owner.class.behaviors.items);
        }
    }

    sortItems () {
        MetaHelper.sortByOrderNumber(this.items);
    }

    getAttrItems () {
        const items = [];
        for (const attr of this.owner.attrs) {
            items.push(...this.getAttrItemBehaviors(attr));
        }
        return items;
    }

    getAttrItemBehaviors (attr) {
        const items = [];
        if (Array.isArray(attr.data.behaviors)) {
            for (const data of attr.data.behaviors) {
                items.push(this.getAttrBehaviorData(attr, data));
            }
        }
        return items;
    }

    getAttrBehaviorData (attr, data) {
        data.attrName = attr.name;
        return data;
    }

    async dropData () {
        if (this.items.length) {
            const owner = this.owner.createModel();
            for (const item of this.items) {
                await ClassHelper.spawn(item, {owner}).dropData();
            }
        }
    }

    log () {
        this.owner.log(...arguments);
    }

    [Symbol.iterator] () {
        return this.items[Symbol.iterator]();
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const MetaHelper = require('../helper/MetaHelper');
const Behavior = require('../behavior/Behavior');