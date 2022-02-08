/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class EnumSet extends Base {

    constructor (config) {
        super(config);
        this.initClassSource();
        this._resolvedItems = this.data.items;
        this.indexItems();
    }

    initClassSource () {
        this._class = this.owner.attr.class.meta.getClass(this.data.class);
        if (this._class) {
            this._view = this._class.getView(this.data.view) || this._class;
            this._attr = this._class.getAttr(this.data.attr);
        }
    }

    isQueryable () {
        return !!this._view;
    }

    hasItem (value) {
        return Object.prototype.hasOwnProperty.call(this._indexedItems, value);
    }

    getData () {
        return {
            condition: this.data.condition,
            items: this._resolvedItems
        };
    }

    getItem (value) {
        value = value === null || value === undefined ? '' : value;
        return this.hasItem(value) ? this._indexedItems[value] : null;
    }

    getText (value) {
        value = value === null || value === undefined ? '' : value;
        return this.hasItem(value) ? this._indexedItems[value].text : value;
    }

    getIndexedItems () {
        return this._indexedItems;
    }

    getQueryableItem (value) {
        if (this.isQueryable()) {
            for (const item of this._resolvedItems) {
                if (item[0] === value || item.value === value) {
                    return item;
                }
            }
        }
    }

    indexItems () {
        this._indexedItems = {};
        if (Array.isArray(this._resolvedItems)) {
            for (const item of this._resolvedItems) {
                if (!(item.hasOwnProperty('text'))) {
                    item.text = item.value;
                }
                this._indexedItems[item.value] = item;
            }
        }
    }

    async resolve () {
        if (!this._view) {
            return;
        }
        const query = this._view.find(this.data.queryFilter);
        const values = this._attr
            ? await query.column(this._attr.name)
            : await query.ids();
        this._resolvedItems = [];
        const valueMap = {};
        for (const value of values) {
            if (valueMap[value] !== true) {
                this._resolvedItems.push([value, this.getText(value)]);
                valueMap[value] = true;
            }
        }
    }
};