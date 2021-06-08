/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class RelationCounterValidator extends Base {

    constructor (config) {
        super({
            skipOnEmpty: false,
            ...config
        });
    }

    getTooFewMessage () {
        return this.createMessage(this.tooFew, 'Relation should contain at least {min} objects', {
            min: this.min
        });
    }

    getTooManyMessage () {
        return this.createMessage(this.tooMany, 'Relation should contain at most {max} objects', {
            max: this.max
        });
    }

    async validateAttr (name, model) {
        const attr = model.view.getAttr(name);
        const docs = await model.related.getLinkedDocs(attr);
        if (this.min && docs.length < this.min) {
            return this.addError(model, name, this.getTooFewMessage());
        }
        if (this.max && docs.length > this.max) {
            return this.addError(model, name, this.getTooManyMessage());
        }
    }
};