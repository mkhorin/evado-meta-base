/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ModelOutput extends Base {

    output () {
        const security = this.security || this.model.security;
        const access = security?.attrAccess;
        const result = {};
        const forbidden = this.model.forbiddenReadAttrs;
        for (const attr of this.model.view.attrs) {
            if ((!access || access.canRead(attr.name)) && (!forbidden || !forbidden.includes(attr.name))) {
                result[attr.name] = this.getAttr(attr, result);
            } else if (result._forbidden) {
                result._forbidden.push(attr.name);
            } else {
                result._forbidden = [attr.name];
            }
        }
        result._id = this.model.getId();
        result._class = this.model.class.name;
        result._title = this.model.getTitle();
        return result;
    }

    getAttr (attr, result) {
        if (attr.relation) {
            return this.getRelationAttr(attr);
        }
        if (attr.embeddedModel) {
            result[`${attr.name}_title`] = this.model.related.getTitle(attr);
            return this.model.get(attr);
        }
        if (attr.enum) {
            const value = this.model.get(attr);
            result[`${attr.name}_title`] = attr.enum.getText(value);
            return value;
        }
        if (attr.isStateView()) {
            const value = this.model.get(attr);
            const state = this.model.class.getState(value);
            if (state) {
                result[`${attr.name}_title`] = state.title;
            }
            return value;
        }
        const value = this.model.header.get(attr);
        return value instanceof Date ? value.toISOString() : value;
    }

    getRelationAttr (attr) {
        if (!attr.isEagerLoading()) {
            return this.model.get(attr);
        }
        const related = this.model.related.get(attr);
        if (!Array.isArray(related)) {
            return related
                ? this.outputRelatedModel(related)
                : this.model.get(attr);
        }
        const result = [];
        for (const model of related) {
            result.push(this.outputRelatedModel(model));
        }
        return result;
    }

    outputRelatedModel (model) {
        return (new this.constructor({model})).output();
    }
};