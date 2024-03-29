/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Samples of calculated expressions
 *
 * {"attrName": "value"}
 * {"attrName": ".attrName"}
 * ["!=", "attrName", "value"]
 * {"$key": ".attrName"} - $key - alias for primary key
 * {"attrName": ".$key"}
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcCondition extends Base {

    prepareResolvingMethod () {
        this.data = this.data[1];
        if (Array.isArray(this.data)) {
            return this.prepareArrayData();
        }
        if (this.data && typeof this.data === 'object') {
            return this.prepareHashData();
        }
        this.log('error', 'Invalid condition');
        this.data = ['false'];
        return this.resolveStatic;
    }

    prepareArrayData () {
        this._operator = this.data[0];
        const method = this.getPrepareMethod();
        return method.call(this, this.data.slice(1));
    }

    getPrepareMethod () {
        if (['and', 'or', 'not'].includes(this.data[0])) {
            return this.prepareChildren;
        }
        const {length} = this.data;
        if (length < 2) {
            return this.prepareStatic;
        }
        return length === 4
            ? this.preparePairValue
            : this.prepareValue;
    }

    prepareStatic () {
        return this.resolveStatic;
    }

    prepareChildren (items) {
        this._children = items
            .map(data => this.createCondition(data))
            .filter(v => !!v);
        return this._children.find(item => !item.isStatic())
            ? this.resolveChildren
            : this.resolveStatic;
    }

    prepareValue (data) {
        const field = this.normalizeFieldItem(0, data);
        this._field = field;
        this._value = this.createToken(data[1], {field});
        return this._value.isStatic()
            ? this.resolveStatic
            : this.resolveValue;
    }

    preparePairValue (data) {
        const field = this.normalizeFieldItem(0, data);
        this._field = field;
        this._value1 = this.createToken(data[1], {field});
        this._value2 = this.createToken(data[2], {field});
        return this._value1.isStatic() && this._value2.isStatic()
            ? this.resolveStatic
            : this.resolvePairValue;
    }

    prepareHashData () {
        this._valueMap = {};
        for (const key of Object.keys(this.data)) {
            const field = this.normalizeFieldKey(key, this.data);
            this._valueMap[field] = this.createToken(this.data[field], {field});
        }
        for (const key of Object.keys(this._valueMap)) {
            if (!this._valueMap[key].isStatic()) {
                return this.resolveHash;
            }
        }
        this.data = this._valueMap;
        for (const key of Object.keys(this.data)) {
            this.data[key] = this.data[key].data;
        }
        return this.resolveStatic;
    }

    getField (name) {
        return name === '$key' ? this.view.getKey() : name;
    }

    normalizeFieldItem (index, items) {
        const name = this.getField(items[index]);
        if (name !== items[index]) {
            items[index] = name;
        }
        return name;
    }

    normalizeFieldKey (key, data) {
        const name = this.getField(key);
        if (name !== key) {
            data[name] = data[key];
            delete data[key];
        }
        return name;
    }

    createCondition (data) {
        return data ? this.createToken(['$condition', data]) : null;
    }

    createToken () {
        return this.calc.createToken(...arguments);
    }

    // RESOLVE

    async resolveHash () {
        const result = {};
        for (const key of Object.keys(this._valueMap)) {
            result[key] = await this._valueMap[key].resolve(...arguments);
        }
        return result;
    }

    async resolveChildren () {
        const result = [this._operator];
        for (const condition of this._children) {
            result.push(await condition.resolve(...arguments));
        }
        return result;
    }

    async resolveValue () {
        const value = await this._value.resolve(...arguments);
        return [this._operator, this._field, value];
    }

    async resolvePairValue () {
        const v1 = await this._value1.resolve(...arguments);
        const v2 = await this._value2.resolve(...arguments);
        return [this._operator, this._field, v1, v2];
    }
};