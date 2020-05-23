/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

// {"attrName": "value"}
// {"$key": "value"} // $key - primary key name
// {"userAttrName": "$user"} // current user
// [">", "dateAttrName", "$now"] // current datetime
// [">", "dateAttrName", "$currentMonth"]
// [">", "dateAttrName", "$currentYear"]
// ["<", "dateAttrName", "$nextMonth"]
// ["<", "dateAttrName", "$nextYear"]
// ["<", "dateAttrName", "$previousMonth"]
// ["<", "dateAttrName", "$previousYear"]

const Base = require('areto/base/Base');

module.exports = class ConditionSolver extends Base {

    constructor (config) {
        super(config);
        this.prepare();
    }

    isStatic () {
        return this.resolve === this.resolveStatic;
    }

    getField (name) {
        return name === '$key' ? this.view.getKey() : name;
    }

    createSolver (config) {
        return new this.constructor({view: this.view, ...config});
    }

    createValue (config) {
        return new ConditionValue({solver: this, ...config});
    }

    prepare () {
        this.resolve = Array.isArray(this.data)
            ? this.prepareArray()
            : this.prepareHash();
    }

    prepareArray () {
        this._operator = this.data[0];
        this._field = this.data[1];
        const method = this.getPrepareMethod();
        return method.call(this, this.data.slice(1));
    }

    prepareHash () {
        this._values = [];
        for (const key of Object.keys(this.data)) {
            const data = this.data[key];
            const field = this.getField(key);
            if (field !== key) {
                this.data[field] = data;
                delete this.data[key];
            }
            const value = this.createValue({field, data});
            this._values.push(value);
        }
        return this.resolveHash;
    }

    getPrepareMethod () {
        if (['AND', 'OR', 'NOR'].includes(this.data[0])) {
            return this.prepareChildren;
        }
        const length = this.data.length;
        if (length > 1) {
            this.data[1] = this.getField(this.data[1]);
        }
        if (length < 2) {
            return this.prepareStatic;
        }
        return length === 4 ? this.preparePairValue : this.prepareValue;
    }

    prepareStatic () {
        return this.resolveStatic;
    }

    prepareChildren (items) {
        this._children = [];
        for (const data of items) {
            const solver = this.createSolver({data});
            this._children.push(solver);
        }
        return this._children.filter(item => !item.isStatic()).length
            ? this.resolveChildren
            : this.resolveStatic;
    }

    prepareValue (data) {
        const field = data[0];
        this._value = this.createValue({data: data[1], field});
        this._field = field;
        return this._value.isStatic() ? this.resolveStatic : this.resolveValue;
    }

    preparePairValue (data) {
        const field = data[0];
        this._value1 = this.createValue({data: data[1], field});
        this._value2 = this.createValue({data: data[2], field});
        this._field = field;
        return this._value1.isStatic() && this._value2.isStatic()
            ? this.resolveStatic
            : this.resolvePairValue;
    }

    // RESOLVE

    resolveStatic () {
        return this.data;
    }

    async resolveHash (query) {
        const result = {};
        for (const value of this._values) {
            result[value.field] = await value.resolve(query);
        }
        return result;
    }

    async resolveChildren (query) {
        const result = [this._operator];
        for (const solver of this._children) {
            result.push(await solver.resolve(query));
        }
        return result;
    }

    async resolveValue (query) {
        const value = await this._value.resolve(query);
        return [this._operator, this._field, value];
    }

    async resolvePairValue (query) {
        const v1 = await this._value1.resolve(query);
        const v2 = await this._value2.resolve(query);
        return [this._operator, this._field, v1, v2];
    }

    log (type, message, data) {
        this.view.log(type, this.wrapClassMessage(message), data);
    }
};

const ConditionValue = require('./ConditionValue');