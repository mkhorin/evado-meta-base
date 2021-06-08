/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 *
 * * Total size of relation files
 */
'use strict';

const Base = require('./Validator');

module.exports = class TotalFileSizeValidator extends Base {

    constructor (config) {
        super({
            // max: 0 // max size in bytes
            // min: 0 // min size in bytes
            defaultMessageSource: 'app',
            ...config
        });
    }

    async validateAttr (name, model) {
        const attr = model.view.getAttr(name);
        if (!attr.relation) {
            return this.addError(model, name, this.createMessage('Relation not defined'));
        }
        if (!attr.relation.refClass.behaviors.fileItem) {
            return this.addError(model, name, this.createMessage('Reference class has no file behavior'));
        }
        const size = await this.getTotalSize(attr, model);
        this.checkTotalSize(size, ...arguments);
    }

    async getTotalSize (attr, model) {
        let total = 0;
        let docs = await model.related.getLinkedDocs(attr);
        let sizeAttr = attr.relation.refClass.behaviors.fileItem.Class.SIZE_ATTR;
        for (let doc of docs) {
            total += doc[sizeAttr];
        }
        return total;
    }

    checkTotalSize (size, name, model) {
        if (this.min && size < this.min) {
            return this.addError(model, name, this.getTooSmallMessage());
        }
        if (this.max && size > this.max) {
            return this.addError(model, name, this.getTooBigMessage());
        }
    }

    getTooSmallMessage () {
        return this.createMessage(this.tooSmall, 'Total file size cannot be smaller than {limit}', {
            limit: [this.min, 'bytes']
        });
    }

    getTooBigMessage () {
        return this.createMessage(this.tooBig, 'Total file size cannot exceed {limit}', {
            limit: [this.max, 'bytes']
        });
    }
};