/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$out", ".attr.sub.ref"]  // return value
// ["$out", ".attr.sub.ref."]  // return title

const Base = require('areto/base/Base');

module.exports = class CalcRelation extends Base {

    constructor (config) {
        super(config);
        let data = this.data.substring(1);
        this._needTitle = data.lastIndexOf('.') === data.length - 1;
        if (this._needTitle) {
            data = data.substring(0, data.length - 1);
        }
        this.chain = this.getAttrChain(data);
        if (this.chain) {
            this.queryData = this.createQueryData();
        }
    }

    getAttrChain (data) {
        const chain = [];
        const names = data.split('.');
        let metaClass = this.calc.attr.class;
        for (let i = 0; i < names.length; ++i) {
            const name = names[i] === '$key' ? metaClass.getKey() : names[i];
            const attr = metaClass.getAttr(name);
            if (!attr) {
                return this.log('error', `${name} not found in ${metaClass.id}`);
            }
            if (attr.relation) {
                metaClass = attr.relation.refClass; // for next relation
            } else if (this._needTitle || i !== names.length - 1) { // not relation can be last attr only
                return this.log('error', `Not relation: ${name}: from ${this.data}`);
            }
            chain.push(attr);
        }
        const back = chain[0].isBackRef();
        if (chain.length === 1 && !back && !this._needTitle) {
            return null;
        }
        return chain.reverse();
    }

    createQueryData (index = 0) {
        const attr = this.chain[index];
        return attr.relation
            ? this.createRefData(index, attr.relation.refAttrName)
            : this.createRefData(index + 1, attr.name);
    }

    createRefData (index, key) {
        const attr = this.chain[index];
        const relation = attr.relation;
        const condition = this.isLastInChain(index)
            ? `.${relation.linkAttrName}`
            : this.createQueryData(index + 1);
        const method = this.getMethod(attr);
        const data = {[relation.refAttrName]: condition};
        return ['$query', method, relation.refClass.id, {key}, data];
    }

    isLastInChain (index) {
        return index + 1 >= this.chain.length;
    }

    getMethod (attr) {
        return attr.relation.multiple ? 'column' : 'scalar';
    }
    
    log () {
        CommonHelper.log(this.calc, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');