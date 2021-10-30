/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class TimestampBehavior extends Base {

    /**
     * @param {Object} config
     * @param {string} config.createdAttr - Null to skip
     * @param {string} config.updateAttr - Null to skip
     */
    constructor (config) {
        super({
            createdAttr: 'createdAt',
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