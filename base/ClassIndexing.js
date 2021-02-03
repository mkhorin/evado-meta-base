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
        for (const data of this.getIndexList()) {
            await this.createIndex(data);
        }
        this.log('info', 'Indexes created');
    }

    async createIndex (data) {
        try {
            await this.getDb().createIndex(this.getTable(), data);
        } catch (err) {
            this.log('error', `Create failed: ${err}`);
        }
    }

    getIndexList () {
        const indexes = this.getIndexListByClass(this.class);
        const descendants = this.class.getDescendants();
        for (const cls of descendants) {
            indexes.push(...this.getIndexListByClass(cls));
        }
        if (descendants.length) {
            indexes.push([{[this.class.CLASS_ATTR]: 1}]);
        }
        return indexes;
    }

    getIndexListByClass (cls) {
        const indexes = [];
        if (Array.isArray(cls.data.indexes)) {
            indexes.push(...cls.data.indexes);
        }
        for (const attr of cls.attrs) {
            const index = this.getAttrIndex(attr);
            if (index) {
                indexes.push(index);
            }
        }
        return indexes;
    }

    getAttrIndex (attr) {
        if (attr.data.indexing) {
            return [{[attr.name]: attr.data.indexing}, {unique: attr.isUnique()}];
        }
    }

    log () {
        CommonHelper.log(this.class, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');