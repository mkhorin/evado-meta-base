/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class TypeHelper extends Base {

    static getConstants () {
        return {
            TYPES: {
                BACK_REF: 'backref',
                BOOLEAN: 'boolean',
                CALC: 'calc',
                DATE: 'date',
                FILE: 'file',
                FLOAT: 'float',
                JSON: 'json',
                ID: 'id',
                INTEGER: 'integer',
                REF: 'ref',
                STRING: 'string',
                TEXT: 'text',
                USER: 'user'
            },
            VIEW_TYPES: {
                CLASS: 'class',
                DATE: 'date',
                DATETIME: 'datetime',
                LOCAL_DATE: 'localDate',
                LOCAL_DATETIME: 'localDatetime',
                STATE: 'state',
                STRING: 'string',
                THUMBNAIL: 'thumbnail',
                TIME: 'time'
            }
        };
    }

    static hasType (type) {
        return Object.values(this.TYPES).includes(type);
    }

    static cast (value, type) {
        if (value === null || value === undefined) {
            return value;
        }
        if (type === this.TYPES.REF || type === this.TYPES.BACK_REF) {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(item => this.cast(item, type));
        }
        switch (type) {
            case this.TYPES.STRING:
                return typeof value !== 'string' ? value.toString() : value;

            case this.TYPES.ID:
                return value instanceof ObjectId ? value : ObjectId.isValid(value) ? ObjectId(value) : null;
            
            case this.TYPES.INTEGER:
                value = parseInt(value);
                return isNaN(value) ? null : value;

            case this.TYPES.FLOAT:
                value = parseFloat(value);
                return isNaN(value) ? null : value;

            case this.TYPES.DATE:
                if (!(value instanceof Date)) {
                    value = new Date(value);
                }
                return isNaN(value.getTime()) ? null : value;

            case this.TYPES.BOOLEAN:
                return !!value;
        }
        return value;
    }

    static getSearchCondition (value, type, attrName, db) {
        switch (type) {
            case this.TYPES.STRING:
            case this.TYPES.TEXT:
                return {[attrName]: new RegExp(EscapeHelper.escapeRegex(value), 'i')};

            case this.TYPES.INTEGER:
            case this.TYPES.FLOAT:
                value = Number(value);
                return isNaN(value) ? null : {[attrName]: value};

            case TypeHelper.TYPES.ID:
            case TypeHelper.TYPES.USER:
                value = db.normalizeId(value);
                return value ? {[attrName]: value} : null;

            case TypeHelper.TYPES.DATE:
                value = DateHelper.getDayInterval(value);
                return value ? ['AND', ['>=', attrName, value[0]], ['<', attrName, value[1]]] : null;                
        }
    }
};
module.exports.init();

const DateHelper = require('areto/helper/DateHelper');
const EscapeHelper = require('areto/helper/EscapeHelper');
const ObjectId = require('mongodb').ObjectID;