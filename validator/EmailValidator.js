/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class EmailValidator extends Base {

    constructor (config) {
        super({
            pattern: '^[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$',
            maxLength: 128,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid email');
    }

    validateValue (value) {
        if (!(new RegExp(this.pattern)).test(value)) {
            return this.getMessage();
        }
    }
};