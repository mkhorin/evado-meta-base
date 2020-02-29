/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class RelationValidator extends Base {

    constructor (config) {
        super({
            allow: null, // allow changes ['unlinks', ...]
            deny: null,
            required: false,
            unique: null,
            min: null,
            max: null,
            skipOnEmpty: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Invalid relation request');
    }

    getRequiredMessage () {
        return this.createMessage(this.requiredMessage, 'Value cannot be blank');
    }

    getUniqueMessage () {
        return this.createMessage(this.uniqueMessage, 'Value has already been taken');
    }

    getNoAttributeMessage () {
        return this.createMessage(this.message, 'Attribute not found');
    }

    async validateAttr (name, model) {
        const data = model.related.getChanges(name);
        if (data === false) {
            return this.addError(model, name, this.getMessage());
        }
        const attr = model.view.getAttr(name);
        if (!attr) {
            return this.addError(model, name, this.getNoAttributeMessage());
        }
        if (data) {
            this.filterChanges(attr, data);
        }
        await this.checkCounter(attr, model);
        if (this.unique) {
            await this.checkUnique(attr, model);
        }
    }

    filterChanges (attr, data) {
        if (Array.isArray(this.allow)) {
            for (const key of Object.keys(data)) {
                if (!this.allow.includes(key)) {
                    data[key] = [];
                }
            }
        }
        if (Array.isArray(this.deny)) {
            for (const key of Object.keys(data)) {
                if (this.deny.includes(key)) {
                    data[key] = [];
                }
            }
        }
    }

    async checkCounter (attr, model) {
        if (!this.required && !this.min && !this.max) {
            return false;
        }
        const docs = await model.related.getLinkedDocs(attr);
        if (this.required && docs.length < 1) {
            this.addError(model, attr.name, this.getRequiredMessage());
        }
    }

    async checkUnique (attr, model) {
        const exist = await model.related.checkExists(attr);
        if (exist === true) {
            this.addError(model, attr.name, this.getUniqueMessage());
        }
    }
};