/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$attr", "attrName"]
// ["$attr", "refAttrName.attrName"]

// ".attrName"
// ".refAttrName.attrName"
// ".refAttrName.refAttrName.$key" // return ID
// ".refAttrName.refAttrName.$title"  // return title

const Base = require('./CalcToken');

module.exports = class CalcAttr extends Base {

    prepareResolvingMethod () {
        return this.data.length > 2
            ? this.prepareNestedAttr()
            : this.prepareAttr();
    }

    prepareAttr () {
        let name = this.data[1];
        name = name === '$key' ? this.calc.attr.class.getKey() : name;
        this._attrName = name;
        return this.resolveAttr;
    }

    prepareNestedAttr () {
        this._chain = this.getAttrChain(this.data.slice(1));
        this._token = this.calc.createToken(this.getQueryData());
        return this.resolveNestedAttr;
    }

    getAttrChain (names) {
        let chain = [];
        let metaClass = this.calc.attr.class;
        for (let name of names) {
            if (name === '$key') {
                chain.push(metaClass.getKey());
                break;
            }
            const attr = metaClass.getAttr(name);
            if (!attr || !attr.relation) {
                chain.push(name);
                break;
            }
            metaClass = attr.relation.refClass;
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

    resolveAttr (params) {
        return params.model.get(this._attrName);
    }

    resolveNestedAttr () {
        return this._token.resolve(...arguments);
    }
};