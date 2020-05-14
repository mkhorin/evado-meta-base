/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Enum extends Base {

    static create (attr) {
        const data = attr.data.enums;
        return Array.isArray(data) && data.length
            ? new Enum({attr, data})
            : attr.classAttr.enum;
    }

    constructor (config) {
        super(config);
        this.createSets();
        this.indexItems();
    }

    hasItem (value) {
        return Object.prototype.hasOwnProperty.call(this._indexedItems, value);
    }

    getItem (value) {
        value = value === null || value === undefined ? '' : value;
        return this.hasItem(value) ? this._indexedItems[value] : null;
    }

    getItems () {
        return Object.values(this._indexedItems);
    }

    getText (value) {
        value = value === null || value === undefined ? '' : value;
        return this.hasItem(value) ? this._indexedItems[value].text : value;
    }

    getSets () {
        const result = [];
        for (const item of this.sets) {
            result.push(item.getData());
        }
        return result;
    }

    createSets () {
        this.sets = [];
        for (const data of this.data) {
            this.sets.push(new EnumSet({owner: this, data}));
        }
        this.queryableSets = this.sets.filter(set => set.isQueryable());
    }

    indexItems () {
        this._indexedItems = {};
        for (const item of this.sets) {
            Object.assign(this._indexedItems, item._indexedItems);
        }
    }
};

const EnumSet = require('./EnumSet');