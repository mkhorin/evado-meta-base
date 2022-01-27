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
        const attr = model.view.getAttr(name);
        const ancestor = attr.parent
            ? this.getFirstUniqueAncestorAttr(attr)
            : null;
        const query = await this.createQuery(name, model, ancestor?.class);
        const ids = await query.limit(2).ids();
        if (this.checkExists(ids, model)) {
            this.addError(model, name, this.getMessage());
        }
    }

    getFirstUniqueAncestorAttr (attr) {
        let result = null;
        for (let ancestor of attr.getAncestors()) {
            if (!ancestor.isUnique()) {
                break;
            }
            result = ancestor;
        }
        return result;
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