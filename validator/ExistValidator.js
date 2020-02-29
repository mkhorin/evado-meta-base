/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Validator');

module.exports = class ExistValidator extends Base {

    constructor (config) {
        super({
            targetClass: null,
            targetAttr: null, // can be array
            filter: null,
            ignoreCase: false,
            ...config
        });
    }

    getMessage () {
        return this.createMessage(this.message, 'Value does not exist');
    }

    getInvalidFilterAttrMessage (name) {
        return this.createMessage(this.invalidFilterAttrMessage, 'Invalid filter attribute: {name}', {name});
    }

    getInvalidFilterSpawnMessage () {
        return this.createMessage(this.invalidFilterSpawnMessage, 'Invalid filter configuration');
    }

    async validateAttr (name, model) {
        const query = await this.createQuery(name, model);
        const counter = await query.count();
        if (!counter) {
            this.addError(model, name, this.getMessage());
        }
    }

    createQuery (attrName, model) {
        const target = this.targetClass
            ? model.class.meta.getClass(this.targetClass)
            : model.class;
        if (!target) {
            throw new Error(`Target class not found: ${this.targetClass}`);
        }
        const query = target.find();
        let names = this.targetAttr || [attrName];
        if (!Array.isArray(names)) {
            names = [names];
        }
        if (this.ignoreCase) {
            for (const name of names) {
                query.and(['LIKE', name, model.get(name)]);
            }
        } else {
            const params = {};
            for (const name of names) {
                params[name] = this.getValue(name, model);
            }
            query.and(params);
        }
        return this.filter ? this.resolveFilter(query, attrName, model) : query;
    }

    getValue (name, model) {
        const attr = model.class.getAttr(name);
        return TypeHelper.cast(model.get(name), attr.getCastType());
    }

    async resolveFilter (query) {
        if (typeof this.filter === 'string') {
            return this.resolveStringFilter(...arguments);
        }
        if (typeof this.filter === 'function') {
            return this.filter(...arguments);
        }
        return this.filter.Class
            ? this.resolveClassFilter(...arguments)
            : query.and(this.filter);
    }

    resolveStringFilter (query, attrName, model) {
        const names = this.filter.split(',');
        for (let name of names) {
            name = name.trim();
            model.class.hasAttr(name)
                ? query.and({[name]: this.getValue(name, model)})
                : this.addError(model, attrName, this.getInvalidFilterAttrMessage(name));
        }
        return query;
    }

    resolveClassFilter (query, attrName, model) {
        if (typeof this.filter.Class !== 'function') {
            this.filter = model.class.meta.resolveSpawn(this.filter);
        }
        if (this.filter) {
            return model.spawn(this.filter).resolve(...arguments);
        }
        this.addError(model, attrName, this.getInvalidFilterSpawnMessage());
        return query;
    }
};

const TypeHelper = require('../helper/TypeHelper');