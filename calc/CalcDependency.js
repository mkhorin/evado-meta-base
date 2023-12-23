/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcDependency extends Base {

    prepareResolvingMethod () {
        this._names = this.data.slice(1);
        this._name = this._names.shift();
        if (!this._name) {
            this.log('error', 'Invalid dependency name');
            return this.resolveStatic;
        }
        this._type = this.getFieldType(this.field);
        if (!this._names.length) {
            return this.resolveDependency;
        }
        this._last = this._names.pop();
        return this.resolveDependencyRelation;
    }

    getFieldType (name) {
        const {view} = this.calc;
        const attr = view.resolveAttr(name);
        if (attr) {
            return attr.relation
                ? attr.relation.getRefAttrType()
                : attr.type;
        }
        return name === view.getKey()
            ? view.class.key.type
            : null;
    }

    getDependencyValue ({dependency}) {
        if (!dependency) {
            return this.log('error', 'Dependency undefined');
        }
        if (Object.hasOwn(dependency, this._name)) {
            return dependency[this._name];
        }
    }

    resolveDependency (data) {
        const value = this.getDependencyValue(data.query);
        return value && this._type
            ? TypeHelper.cast(value, this._type)
            : value;
    }

    async resolveDependencyRelation (data) {
        let value = this.getDependencyValue(data.query);
        if (!value) {
            return null;
        }
        if (typeof value === 'string') {
            value = value.split(',');
        }
        const {model} = data.query;
        if (!model) {
            return this.log('error', 'Invalid model');
        }
        let attr = model.view.resolveAttr(this._name);
        if (!attr.relation) {
            return this.log('error', `Not relation attribute: ${attr.id}`);
        }
        let view = attr.eagerView;
        let config = model.related.getQueryConfig();
        let models = await view.createQuery(config).byId(value).all();
        let {multiple} = attr.relation;
        for (const name of this._names) {
            if (!models.length) {
                break;
            }
            attr = view.resolveAttr(name);
            if (!attr) {
                return this.log('error', `Attribute not found: ${name}.${view.id}`);
            }
            if (!attr.relation) {
                return this.log('error', `Not relation attribute: ${attr.id}`);
            }
            const result = [];
            for (const model of models) {
                const value = await model.related.resolve(attr);
                Array.isArray(value)
                    ? result.push(...value)
                    : value ? result.push(value) : null;
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
            Array.isArray(value)
                ? result.push(...value)
                : result.push(value);
        }
        return result;
    }
};

const TypeHelper = require('../helper/TypeHelper');