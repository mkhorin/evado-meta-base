/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class DataHistoryBehavior extends Base {

    static getDefaultSpawn (view) {
        if (!view.historyAttrs.length) {
            return null;
        }
        return {
            Class: this,
            type: 'history'
        };
    }

    beforeUpdate () {
        return this.appendData(this.getSourceData());
    }

    afterTransit (data) {
        if (this.owner.class.getStateAttr()?.isHistory()) {
            return this.appendData(this.getStateSourceData(data));
        }
    }

    afterDelete () {
        return this.getHistoryModel()?.findByOwner().delete();
    }

    appendData (data) {
        if (data) {
            return this.getHistoryModel()?.append(data);
        }
    }

    getHistoryModel () {
        const {owner} = this;
        const {DataHistoryModel} = owner.getMeta();
        return DataHistoryModel
            ? owner.spawn(DataHistoryModel, {owner})
            : null;
    }

    getSourceData () {
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

    getStateSourceData ({transition, startState}) {
        return {
            _state: startState,
            _transition: transition.name
        };
    }

    dropData () {
        const model = this.getHistoryModel();
        return model?.getDb().drop(model.getTable());
    }
};