/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Enum extends Base {

    constructor (config) {
        super(config);
        this.createSets();
        this.indexItems();
    }

    hasItem (value) {
        return Object.prototype.hasOwnProperty.call(this._indexedItems, value);
    }

    getItem (value) {
        if (value === null || value === undefined) {
            value = '';
        }
        return this.hasItem(value)
            ? this._indexedItems[value]
            : null;
    }

    getItems () {
        return Object.values(this._indexedItems);
    }

    getText (value) {
        return this.getItem(value)?.text || '';
    }

    getSets () {
        const result = [];
        for (const item of this.sets) {
            result.push(item.getData());
        }
        return result;
    }

    getQueryableItem (value) {
        for (const set of this.queryableSets) {
            const item = set.getQueryableItem(value);
            if (item) {
                return item;
            }
        }
    }

    createSets () {
        this.sets = [];
        for (const data of this.data) {
            this.sets.push(this.createSet(data));
        }
        this.queryableSets = this.sets.filter(set => set.isQueryable());
    }

    createSet (data) {
        return new EnumSet({
            owner: this,
            data
        });
    }

    indexItems () {
        this._indexedItems = {};
        for (const item of this.sets) {
            Object.assign(this._indexedItems, item.getIndexedItems());
        }
    }
};

const EnumSet = require('./EnumSet');