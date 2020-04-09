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
        return this.hasItem(value) ? this._indexedItems[value] : null;
    }

    getText (value) {
        return this.hasItem(value) ? this._indexedItems[value].text : value;
    }

    indexItems () {
        this._indexedItems = {};
        if (Array.isArray(this.data.items)) {
            for (const item of this.data.items) {
                if (!(item.hasOwnProperty('text'))) {
                    item.text = item.value;
                }
                this._indexedItems[item.value] = item;
            }
        }
    }

    async resolve () {
        if (!this._view) {
            return null;
        }
        const query = this._view.find().and(this.data.queryFilter);
        const values = this._attr
            ? await query.distinct(this._attr.name)
            : await query.ids();
        this._resolvedItems = values.map(value => ([value, this.getText(value)]));
    }
};