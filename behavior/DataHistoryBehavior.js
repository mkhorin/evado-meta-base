/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class DataHistoryBehavior extends Base {

    static getDefaultConfig (view) {
        if (!view.historyAttrs.length) {
            return null;
        }
        return {
            Class: this,
            type: 'history'
        };
    }

    getHistoryModel () {
        const Class = this.owner.getMeta().DataHistoryModel;
        return Class
            ? this.owner.spawn(Class, {owner: this.owner})
            : null;
    }

    beforeUpdate () {
        const data = this.getData();
        return data ? this.getHistoryModel()?.append(data) : null;
    }

    afterDelete () {
        return this.getHistoryModel()?.findByOwner().delete();
    }

    getData () {
        const data = {};
        for (const attr of this.owner.view.historyAttrs) {
            if (attr.relation) {
                const changes = this.owner.related.serializeChanges(attr);
                if (changes) {
                    data[attr.name] = changes;
                }
            } else if (this.owner.isValueChanged(attr)) {
                data[attr.name] = this.getOldValue(attr);
            }
        }
        return Object.values(data).length ? data : null;
    }

    dropData () {
        const model = this.getHistoryModel();
        return model?.getDb().drop(model.getTable());
    }
};