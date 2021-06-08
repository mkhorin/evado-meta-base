/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./ViewBehaviors');

module.exports = class ClassBehaviors extends Base {

    static getDefaultBehaviorClasses () {
        return [
            FileBehavior,
            HistoryBehavior
        ];
    }

    getAttrItemBehaviors (attr) {
        const items = super.getAttrItemBehaviors(attr);
        if (attr.data.trim && !attr.isReadOnly() && (attr.isString() || attr.isText())) {
            items.push(this.getAttrBehaviorData(attr, {type: 'trim'}));
        }
        return items;
    }
};

const FileBehavior = require('../behavior/FileBehavior');
const HistoryBehavior = require('../behavior/DataHistoryBehavior');