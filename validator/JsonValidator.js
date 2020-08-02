/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class JsonValidator extends Base {

    getMessage () {
        return this.createMessage(this.message, 'Invalid JSON');
    }

    validateValue (value) {
        try {
            JSON.parse(value);
        } catch {
            return this.getMessage();
        }
    }
};