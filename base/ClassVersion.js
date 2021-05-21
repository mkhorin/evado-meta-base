/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ClassVersion extends Base {

    static create (source) {
        const name = source.data.version;
        const target = source.meta.getClass(name);
        if (target) {
            return new this({source, target});
        }
        if (name) {
            source.log('error', `Version class not found: ${name}`);
        }
    }

    constructor (config) {
        super(config);
        this.target.originalVersion = this;
    }

    prepare () {
        this.versions = [];
        this.resolveVersions(this.target);
        if (this.versions.length) {
            const names = this.versions.map(item => item.name);
            this.versions[0].condition.add(names);
            this.target = this.versions[this.versions.length - 1];
        }
        if (!this.source.originalVersion) {
            this.versions.forEach(this.assignOriginalData, this);
        }
    }

    resolveVersions (target) {
        if (target === this.source) {
            return this.log('error', 'Circular dependency detected');
        }
        this.versions.push(target);
        const version = target?.version;
        return version ? this.resolveVersions(version.target) : null;
    }

    assignOriginalData (target) {
        target.table = this.source.table;
    }

    log () {
        CommonHelper.log(this.source, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');