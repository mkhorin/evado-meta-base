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
        name = name === '$key' ? this.calc.view.class.getKey() : name;
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
            if (!attr || !attr.relation) {
                chain.push(name);
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
        const attr = this._chain[1];
        if (!attr) {
            return null;
        }
        const name = this._chain[0];
        const title = name === '$title';
        const rel = attr.relation;
        const method = title
            ? (rel.multiple ? 'titles' : 'title')
            : (rel.multiple ? 'column' : 'scalar');
        const select = title ? null : {key: name};
        const value = this.getNestedQueryData(1) || `.${rel.linkAttrName}`;
        return ['$query', method, rel.refClass.id, select, {[rel.refAttrName]: value}];
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
        return ['$query', method, rel.refClass.id, {key}, {[rel.refAttrName]: value}];
    }

    resolveAttr ({model}) {
        return model.get(this._attrName);
    }

    async resolveBackRefAttr ({model}) {
        return (await model.related.createQuery(this._attr)).id();
    }

    async resolveMultipleBackRefAttr ({model}) {
        return (await model.related.createQuery(this._attr)).ids();
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