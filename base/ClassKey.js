/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ClassKey extends Base {

    constructor (config) {
        super(config);
        this.name = this.class.data.key || '_id';
    }

    prepare () {
        this.attr = this.class.getAttr(this.name);
        this.type = this.getAttrType(this.attr);
    }

    getAttrType (attr) {
        if (!attr) {
            return TypeHelper.TYPES.ID;
        }
        if (attr.relation) {
            return this.getAttrType(attr.relation.refAttr)
        }
        return attr.getType();
    }

    createAttr () {
        return new ClassAttr({
            class: this.class,
            data: {
                name: this.name,
                type: TypeHelper.TYPES.ID,
                readOnly: true,
                sortable: true,
                visible: false
            }
        });
    }

    getCondition (value) {
        value = this.normalize(value);
        return value ? {[this.name]: value} : null;
    }

    getNotCondition (value) {
        value = this.normalize(value);
        return value ? ['notId', this.name, value] : null;
    }

    normalize (value) {
        switch (this.type) {
            case TypeHelper.TYPES.ID: {
                return this.class.getDb().normalizeId(value);
            }
            case TypeHelper.TYPES.STRING: {
                return Array.isArray(value)
                    ? value.map(v => String(v))
                    : String(value);
            }
            case TypeHelper.TYPES.INTEGER: {
                return Array.isArray(value)
                    ? value.map(v => parseInt(v))
                    : parseInt(v);
            }
        }
        this.class.log('error', `Invalid key type: ${this.type}`);
    }
};

const TypeHelper = require('../helper/TypeHelper');
const ClassAttr = require('../attr/ClassAttr');