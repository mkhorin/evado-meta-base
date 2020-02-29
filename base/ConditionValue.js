/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ConditionValue extends Base {

    constructor (config) {
        super(config);
        this.prepare();
    }

    isStatic () {
        return this.resolve === this.resolveStatic;
    }

    prepare () {
        let view = this.solver.view;
        let attr = view.resolveAttr(this.field);
        if (attr) {
            this._type = attr.relation ? attr.relation.getRefAttrType() : attr.type;
        } else if (this.field === view.getKey()) {
            this._type = view.class.key.type;
        }
        this._attr = attr;
        this.resolve = this.getResolveMethod();
    }

    getResolveMethod () {
        switch (this.data) {
            case '$now': return this.resolveNow;
            case '$user': return this.resolveUser;
        }
        if (!Array.isArray(this.data)) {
            return this.resolveStatic;
        }
        switch (this.data[0]) {
            case '$dep': return this.getDependencyResolveMethod();
        }
        return this.getChildrenResolveMethod();
    }

    getChildrenResolveMethod () {
        this._children = [];
        for (const data of this.data) {
            const value = this.solver.createValue({field: this.field, data});
            this._children.push(value);
        }
        return this._children.filter(item => !item.isStatic).length
            ? this.resolveChildren
            : this.resolveStatic;
    }

    getDependencyResolveMethod () {
        this._name = this.data[1];
        if (typeof this._name !== 'string') {
            this.log('error', 'Invalid dependency name', this.data);
            return this.resolveStatic;
        }
        if (!this._name.includes('.')) {
            return this.resolveDependency;
        }
        this._names = this._name.split('.');
        this._name = this._names.shift();
        this._last = this._names.pop();
        return this.resolveDependencyRelation;
    }

    // RESOLVE

    resolveStatic () {
        return this.data;
    }

    async resolveChildren (query) {
        const result = [];
        for (const child of this._children) {
            result.push(await child.resolve(query));
        }
        return result;
    }

    resolveNow () {
        return new Date;
    }

    resolveUser (query) {
        return query.user.getId();
    }

    resolveDependency (query) {
        const value = this.getDependencyValue(query);
        return this._type && value ? TypeHelper.cast(value, this._type) : value;
    }

    async resolveDependencyRelation (query) {
        let value = this.getDependencyValue(query);
        if (!value) {
            return null;
        }
        if (typeof value === 'string') {
            value = value.split(',');
        }
        let model = query.model;
        if (!model) {
            return this.log('error', 'Invalid model', this.data);
        }
        let attr = model.view.resolveAttr(this._name);
        if (!attr.relation) {
            return this.log('error', `Not relation attribute: ${attr.id}`, this.data);
        }
        let view = attr.eagerView;
        let config = model.related.getQueryConfig();
        let models = await view.findById(value, config).all();
        let multiple = attr.relation.multiple;
        for (const name of this._names) {
            if (!models.length) {
                break;
            }
            attr = view.resolveAttr(name);
            if (!attr.relation) {
                return this.log('error', `Not relation attribute: ${attr.id}`, this.data);
            }
            const result = [];
            for (const model of models) {
                const value = await model.related.resolve(attr);
                Array.isArray(value) ? result.push(...value) : result.push(value);
            }
            multiple = attr.relation.multiple ? true : multiple;
            view = attr.eagerView;
            models = result;
        }
        const key = this._last === '$key' ? view.getKey() : this._last;
        if (!multiple) {
            return models.length ? models[0].get(key) : null;
        }
        const result = [];
        for (const model of models) {
            const value = model.get(key);
            Array.isArray(value) ? result.push(...value) : result.push(value);
        }
        return result;
    }

    getDependencyValue ({dependency}) {
        if (!dependency) {
            return this.log('error', 'Dependency undefined');
        }
        if (dependency.hasOwnProperty(this._name)) {
            return dependency[this._name];
        }
    }

    log () {
        this.solver.log(...arguments);
    }
};

const TypeHelper = require('../helper/TypeHelper');