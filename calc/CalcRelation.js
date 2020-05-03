/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$out", ".refAttrName.attrName"]
// ["$out", ".refAttrName.refAttrName.$key"] // return ID
// ["$out", ".refAttrName.refAttrName.$title"]  // return title

const Base = require('areto/base/Base');

module.exports = class CalcRelation extends Base {

    constructor (config) {
        super(config);
        this.chain = this.getAttrChain(this.data.substring(1));
    }

    getAttrChain (data) {
        let chain = [];
        let metaClass = this.calc.attr.class;
        let names = data.split('.');
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
            return this.log('error', `Invalid data: ${this.data}`);
        }
        const attr = chain[chain.length - 1];
        if (attr.relation) {
            chain.splice(chain.length - 1, 1, attr.name);
        }
        return chain.reverse();
    }

    getQueryData () {
        const attr = this.chain[1];
        if (!attr) {
            return null;
        }
        const name = this.chain[0];
        const title = name === '$title';
        const rel = attr.relation;
        const method = title ? (rel.multiple ? 'titles' : 'title') : (rel.multiple ? 'column' : 'scalar');
        const select = title ? null : {key: name};
        const value = this.getNestedQueryData(1) || `.${rel.linkAttrName}`;
        return ['$query', method, rel.refClass.id, select, {[rel.refAttrName]: value}];
    }

    getNestedQueryData (index) {
        const parent = this.chain[index + 1];
        if (!parent) {
            return null;
        }
        const rel = parent.relation;
        const method = rel.multiple ? 'column' : 'scalar';
        const key = this.chain[index].relation.linkAttrName;
        const value = this.getNestedQueryData(index + 1) || `.${rel.linkAttrName}`;
        return ['$query', method, rel.refClass.id, {key}, {[rel.refAttrName]: value}];
    }

    log () {
        CommonHelper.log(this.calc, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');