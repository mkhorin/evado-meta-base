/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class RangeValidator extends Base {

    constructor (config) {
        super({
            range: null,
            not: false,
            allowArray: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid range');
    }

    validateValue (value) {
        if (!Array.isArray(this.range)) {
            throw new Error('Range property must be array');
        }
        if (!this.allowArray && Array.isArray(value)) {
            return this.getMessage();
        }
        const values = Array.isArray(value) ? value : [value];
        let inRange = true;
        for (const item of values) {
            if (!this.range.includes(item)) {
                inRange = false;
                break;
            }
        }
        if (this.not === inRange) {
            return this.getMessage();
        }
    }
};