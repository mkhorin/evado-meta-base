/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./ExistValidator');

module.exports = class UniqueValidator extends Base {

    getMessage () {
        return this.createMessage(this.message, 'Value has already been taken');
    }

    async validateAttr (name, model) {
        const query = await this.createQuery(name, model);
        const ids = await query.limit(2).ids();
        if (this.checkExists(ids, model)) {
            this.addError(model, name, this.getMessage());
        }
    }

    checkExists (ids, model) {
        if (ids.length === 0) {
            return false;
        }
        if (ids.length > 1 || this.targetClass) {
            return true;
        }
        const id = model.getId();
        return !id || !CommonHelper.isEqual(id, ids[0]);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');