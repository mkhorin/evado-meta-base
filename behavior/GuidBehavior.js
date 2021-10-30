/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class GuidBehavior extends Base {

    async beforeInsert () {
        const value = await this.generate();
        this.owner.set(this.attrName, value);
    }

    generate () {
        return MongoHelper.createId().toString();
    }
};

const MongoHelper = require('areto/helper/MongoHelper');