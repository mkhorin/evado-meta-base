/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./ViewAttr');

module.exports = class ClassAttr extends Base {

    init () {
        this.name = this.data.name;
        this.type = this.data.type || TypeHelper.TYPES.STRING;
        this.viewType = this.data.viewType || this.type;
        this.view = this.view || this.class;
        this.id = `${this.name}.${this.class.id}`;
        this.classAttr = this;
        this.embeddedModel = this.createEmbeddedModel();
        this.templateKey = `_attr/${this.class.name}/${this.name}`;
        this.translationKey = `${this.class.translationKey}.attr.${this.name}`;
        this.initCommon();
    }

    createEmbeddedModel () {
        const constructor  = this.getEmbeddedModelConstructor();
        return constructor
            ? this.class.meta.spawn(constructor)
            : null;
    }

    getEmbeddedModelConstructor () {
        switch (this.type) {
            case TypeHelper.TYPES.USER: {
                return this.class.meta.hub.User;
            }
        }
    }

    setParent () {
        this.parent = this.class.getParent()?.getAttr(this.name);
    }

    createRelation () {
        if (this.data.refClass) {
            this.relation = new Relation({attr: this});
            this.setRelationViews();
        }
    }

    createCalc () {
        const expression = this.data.expression;
        this.calc = this.parent && this.parent.data.expression === expression
            ? this.parent.calc
            : this.spawnCalc(expression);
    }

    resolveHeader (docs) {
        if (this.data.asRaw || !this.relation) {
            return;
        }
        if (this.relation.refClass.header) {
            return this.relation.refClass.header.resolve(docs);
        }
        for (const doc of docs) {
            doc._$title = doc[this.relation.refClass.getKey()];
        }
    }
};

const Relation = require('./Relation');
const TypeHelper = require('../helper/TypeHelper');