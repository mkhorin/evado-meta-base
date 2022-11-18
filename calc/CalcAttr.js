/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Examples of calculated expressions
 *
 * ["$attr", "attrName"]
 * ["$attr", "refAttrName.attrName"]
 * ".attrName"
 * ".refAttrName.attrName"
 * ".refAttrName.refAttrName.$key" - Get ID
 * ".refAttrName.refAttrName.$title" - Get title
 */
'use strict';

const Base = require('./CalcToken');

module.exports = class CalcAttr extends Base {

    prepareResolvingMethod () {
        return this.data.length > 2
            ? this.prepareNestedAttr()
            : this.prepareAttr();
    }

    prepareAttr () {
        let name = this.data[1];
        if (name === '$key') {
            name = this.calc.view.class.getKey();
        }
        this._attrName = name;
        let attr = this.calc.view.getAttr(name);
        this._attr = attr;
        if (attr?.isBackRef()) {
            return attr.relation.multiple
                ? this.resolveMultipleBackRefAttr
                : this.resolveBackRefAttr;
        }
        if (attr?.isCalc()) {
            return this.resolveCalcAttr;
        }
        return this.resolveAttr;
    }

    prepareNestedAttr () {
        this._chain = this.getAttrChain(this.data.slice(1));
        this._token = this.calc.createToken(this.getQueryData());
        return this.resolveNestedAttr;
    }

    getAttrChain (names) {
        let chain = [];
        let cls = this.calc.view.class;
        for (let name of names) {
            if (name === '$key') {
                chain.push(cls.getKey());
                break;
            }
            const attr = cls.getAttr(name);
            if (!attr) {
                chain.push(name);
                break;
            }
            if (!attr.relation) {
                chain.push(attr);
                break;
            }
            cls = attr.relation.refClass;
            chain.push(attr);
        }
        if (chain.length !== names.length) {
            return this.log('error', 'Invalid data');
        }
        const attr = chain[chain.length - 1];
        if (attr.relation) {
            chain.splice(chain.length - 1, 1, attr.name);
        }
        return chain.reverse();
    }

    getQueryData () {
        const parent = this._chain[1];
        if (!parent) {
            return null;
        }
        const rel = parent.relation;
        const [operation, params] = this.getQueryParams(this._chain[0], rel.multiple);
        const value = this.getNestedQueryData(1) || `.${rel.linkAttrName}`;
        const condition = {[rel.refAttrName]: value};
        return ['$query', operation, rel.refClass.id, params, condition];
    }

    getQueryParams (attr, multiple) {
        if (attr === '$title') {
            return [multiple ? 'titles' : 'title', null];
        }
        const name = attr.name || attr;
        if (attr.isCalc?.()) {
            return [multiple ? 'calcAttrs' : 'calcAttr', {attr: name}];
        }
        return [multiple ? 'column' : 'scalar', {key: name}];
    }

    getNestedQueryData (index) {
        const parent = this._chain[index + 1];
        if (!parent) {
            return null;
        }
        const rel = parent.relation;
        const method = rel.multiple ? 'column' : 'scalar';
        const key = this._chain[index].relation.linkAttrName;
        const value = this.getNestedQueryData(index + 1) || `.${rel.linkAttrName}`;
        const condition = {[rel.refAttrName]: value};
        return ['$query', method, rel.refClass.id, {key}, condition];
    }

    resolveAttr ({model}) {
        return model.get(this._attrName);
    }

    async resolveBackRefAttr ({model}) {
        const query = await model.related.createQuery(this._attr);
        return query.id();
    }

    async resolveMultipleBackRefAttr ({model}) {
        const query = await model.related.createQuery(this._attr);
        return query.ids();
    }

    resolveCalcAttr ({model}) {
        return model.has(this._attr)
            ? model.get(this._attr)
            : this._attr.calc.resolve(model);
    }

    resolveNestedAttr () {
        return this._token.resolve(...arguments);
    }
};