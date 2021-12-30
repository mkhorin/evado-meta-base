/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ClassCondition extends Base {

    constructor (config) {
        super(config);
        this.where = null;
    }

    resolveInheritance () {
        if (!this.class.parent) {
            return;
        }
        const descendants = this.class.getDescendants().filter(item => !item.isAbstract());
        const names = descendants.map(item => item.name);
        if (!this.class.isAbstract()) {
            names.push(this.class.name);
        }
        this.add(names.length ? names : false);
    }

    add (data) {
        if (data === false) {
            this.where = ['false'];
            return;
        }
        if (Array.isArray(this.where)) {
            this.log('error', 'Condition is not extensible:', data);
            return;
        }
        if (!this.where) {
            this.where = {};
        }
        data = Array.isArray(data) ? data : [data];
        let values = this.where[this.class.CLASS_ATTR];
        if (Array.isArray(values)) {
            values.push(...data);
        } else if (values) {
            values = [values, ...data];
        } else {
            values = data;
        }
        this.where[this.class.CLASS_ATTR] = values.length > 1 ? values : values[0];
    }

    log () {
        CommonHelper.log(this.class, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');