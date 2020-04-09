/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

// {"attrName": "value"}
// {"attrName": ".attrName"}
// ["!=", "attrName", "value"]
// {"$key": ".attrName"} // $key - alias for primary key name

module.exports = class CalcCondition extends Base {

    constructor (config) {
        super(config);
        if (Array.isArray(this.data)) {
            this.createSimple();
        } else if (this.data && typeof this.data === 'object') {
            this.createHash();
        }
    }

    createSimple () {
        this.method = this.constructor.prototype.resolveSimple;
        this.operator = this.data[0];
        this.operands = this.data.slice(1).map(this.createOperand, this);
    }

    createHash () {
        // hash condition - {a1: 1, a2: [1, 2, 3]}
        this.method = this.constructor.prototype.resolveHash;
        for (let key of Object.keys(this.data)) {
            const value = this.data[key];
            if (key === '$key') {
                delete this.data[key];
                key = this.token.view.getKey();
            }
            this.data[key] = this.createOperand(value);
        }
    }

    createOperand (data) {
        return this.token.createOperand(data);
    }

    resolve (model) {
        return this.method ? this.method.call(this, model) : null;
    }

    async resolveSimple (model) {
        const values = [];
        if (Array.isArray(this.operands)) {
            for (const operand of this.operands) {
                values.push(await operand.resolve(model));
            }
        }
        values.unshift(this.operator);
        return values;
    }

    async resolveHash (model) {
        const result = {};
        if (this.data) {
            for (const key of Object.keys(this.data)) {
                result[key] = await this.data[key].resolve(model);
            }
        }
        return result;
    }
};