/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ClassIndexing extends Base {

    getDb () {
        return this.class.getDb();
    }

    getTable () {
        return this.class.table;
    }

    async drop () {
        await this.getDb().dropIndexes(this.getTable());
        this.log('info', 'Indexes dropped');
    }

    async create () {
        const items = this.getIndexItems();
        for (const item of items) {
            await this.createIndex(item);
        }
        this.log('info', 'Indexes created');
    }

    async createIndex (data) {
        try {
            await this.getDb().createIndex(this.getTable(), data);
        } catch (err) {
            this.log('error', `Creation failed: ${err}`);
        }
    }

    getIndexItems () {
        const indexes = this.getIndexItemsByClass(this.class);
        const descendants = this.class.getDescendants();
        for (const cls of descendants) {
            const items = this.getIndexItemsByClass(cls);
            indexes.push(...items);
        }
        if (descendants.length) {
            indexes.push([{[this.class.CLASS_ATTR]: 1}]);
        }
        return indexes;
    }

    getIndexItemsByClass ({data, attrs}) {
        return[
            ...this.getIndexItemsByData(data.indexes),
            ...this.getIndexItemsByAttrs(attrs)
        ];
    }

    getIndexItemsByData (indexes) {
        return indexes?.filter?.(([attrs]) => Object.values(attrs).length) || [];
    }

    getIndexItemsByAttrs (attrs) {
        return attrs.map(this.getIndexItemByAttr, this).filter(v => !!v);
    }

    getIndexItemByAttr (attr) {
        const indexing = attr.data.indexing;
        if (indexing) {
            const unique = attr.isUnique();
            return [{[attr.name]: indexing}, {unique}];
        }
    }

    log () {
        CommonHelper.log(this.class, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');