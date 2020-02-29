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
        const indexes = [];
        if (Array.isArray(this.class.data.indexes)) {
            indexes.push(...this.class.data.indexes);
        }
        for (const attr of this.class.attrs) {
            const index = this.getAttrIndex(attr);
            if (index) {
                indexes.push(index);
            }
        }
        indexes.push([{[this.class.CLASS_ATTR]: 1}]);
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