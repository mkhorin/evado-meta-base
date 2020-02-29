/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class TimestampBehavior extends Base {

    constructor (config) {
        super({
            createdAttr: 'createdAt', // or null
            updatedAttr: 'updatedAt',
            ...config
        });
    }

    beforeInsert () {
        if (this.createdAttr) {
            this.owner.set(this.createdAttr, new Date);
        }
    }

    beforeUpdate () {
        if (this.updatedAttr) {
            this.owner.set(this.updatedAttr, new Date);
        }
    }
};