/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('./Validator');

module.exports = class RegexValidator extends Base {

    static getConstants () {
        return {
            PATTERNS: {
                reservedFileNameChars: /[<>:"\/\\|?*\x00-\x1F]/g,
                reservedWindowsFileName: /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i
            }
        };
    }

    constructor (config) {
        super({
            // pattern: '^test',
            // flags: 'i'
            mismatch: false, // not match pattern
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid value');
    }

    validateValue (value) {
        if (typeof value !== 'string') {
            return this.getMessage();
        }
        const regex = this.getRegex();
        if (regex.test(value) ? this.mismatch : !this.mismatch) {
            return this.getMessage();
        }
    }

    getRegex () {
        return Object.prototype.hasOwnProperty.call(this.PATTERNS, this.pattern)
            ? this.PATTERNS[this.pattern]
            : new RegExp(this.pattern, this.flags);
    }
};
module.exports.init();