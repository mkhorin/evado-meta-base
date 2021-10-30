/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('./Validator');

module.exports = class RegexValidator extends Base {

    static getConstants () {
        return {
            PATTERNS: {
                reservedFilenameChars: /[<>:"\/\\|?*\x00-\x1F]/g,
                reservedWindowsFilename: /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i
            }
        };
    }

    /**
     * @param {Object} config
     * @param {string} config.pattern - Regex pattern
     * @param {string} config.flags - Regex flags
     * @param {boolean} config.mismatch - Not match pattern
     */
    constructor (config) {
        super({
            mismatch: false,
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