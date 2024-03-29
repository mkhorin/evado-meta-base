/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class RangeValidator extends Base {

    /**
     * @param {Object} config
     * @param {number[]|string[]} config.values - Range values
     * @param {boolean} config.not - Invert validation result
     * @param {string} config.allowArray - Validated value can be an array
     */
    constructor (config) {
        super({
            not: false,
            allowArray: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid range');
    }

    validateValue (value) {
        if (!Array.isArray(this.values)) {
            throw new Error('Values property must be array');
        }
        if (!this.allowArray && Array.isArray(value)) {
            return this.getMessage();
        }
        const values = Array.isArray(value) ? value : [value];
        let inRange = true;
        for (const item of values) {
            if (!this.values.includes(item)) {
                inRange = false;
                break;
            }
        }
        if (this.not === inRange) {
            return this.getMessage();
        }
    }
};