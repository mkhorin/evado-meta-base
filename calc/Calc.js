/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// ["$out", ".attrName"]
// ["$+", ".attrName", 45, ...]
// ["$+", ".attrName", ["$-", 67, ".attrName"]]
// ["$join", "separator", ".towns", ... ]
// ["$map", "toUpperCase", ".towns", ...]
// ["$method", ".attrName", "toLowerCase", ...methodArguments] // execute value method
// ["$moment", ["$now"], "format", "MM-DD"]
// ["$now"] // current datetime
// ["$round", ".attrName", precision]
// ["$user"] // current user ID
// ["$query", ...] // see CalcQuery
// ["$descendants", ...] // see CalcDescendants
// ["$custom", {"Class": "component/meta/calc/CustomCalcToken"}]

const Base = require('areto/base/Base');

module.exports = class Calc extends Base {

    static prepareConfiguration (data, view) {
        if (!data) {
            return null;
        }
        const module = view.meta.module;
        if (data.Class) {
            return ClassHelper.resolveSpawn(data, module, {module});
        }
        const solver = new ConditionSolver({data, view});
        return {Class: this, module, solver};
    }

    constructor (config) {
        super(config);
        this.token = this.createToken(this.data);
    }

    isAttrName (name) {
        return typeof name === 'string' && name.indexOf('.') === 0;
    }

    getClass (id) {
        return this.attr.class.meta.getClass(id);
    }

    getView (id) {
        return this.attr.class.meta.getView(id);
    }

    getTokenClass (data) {
        switch (data[0]) {
            case '$query': return CalcQuery;
            case '$descendants': return CalcDescendants;
            case '$custom': return this.getCustomTokenClass(data[1]);
        }
        return CalcToken;
    }

    getCustomTokenClass (data) {
        try {
            return ClassHelper.resolveSpawn(data, this.attr.getMeta().module);
        } catch (err) {
            this.log('error', 'Invalid custom calc configuration', err);
        }
    }

    createOperand (value) {
        return this.createToken(value)
            || this.createRelation(value)
            || this.createAttr(value)
            || new Operand({value});
    }

    createToken (data) {
        if (!Array.isArray(data)) {
            return null;
        }
        const TokenClass = this.getTokenClass(data);
        if (!TokenClass) {
            return null;
        }
        const token = ClassHelper.spawn(TokenClass, {
            calc: this,
            operator: data[0],
            operands: data.slice(1)
        });
        return token.method ? token : null;
    }

    createRelation (data) {
        if (this.isAttrName(data) && data.charAt(1) !== '_' && data.charAt(1) !== '$') {
            const relation = new CalcRelation({calc: this, data});
            return this.createToken(relation.queryData);
        }
    }

    createAttr (name) {
        if (this.isAttrName(name)) {
            name = name.substring(1);
            name = name === '$key' ? this.attr.class.getKey() : name;
            if (this.attr.class.getAttr(name) || name.charAt(0) === '_') {
                return new AttrOperand({name});
            }
        }
    }

    async resolveAll (models) {
        for (const model of models) {
            model.set(this.attr, await this.resolve(model));
        }
    }

    resolve (model) {
        return this.token ? this.token.resolve(model) : this.data;
    }

    log () {
        CommonHelper.log(this.attr, this.constructor.name, ...arguments);
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const CalcToken = require('./CalcToken');
const CalcDescendants = require('./CalcDescendants');
const CalcQuery = require('./CalcQuery');
const CalcRelation = require('./CalcRelation');
const Operand = require('./Operand');
const AttrOperand = require('./AttrOperand');