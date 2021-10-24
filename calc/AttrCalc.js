/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Examples of calculated expressions
 *
 * ["$attr", "attrName"]
 * ["$attr", "refAttrName", "attrName"]
 * ["$attr", "$key"] - Get primary key
 * ["$descendants", "parentAttrName", [condition]] - Get descendant IDs by parent
 *
 * Shortcut expressions
 *
 * ".attrName"
 * ".refAttrName.attrName"
 */
'use strict';

const Base = require('./Calc');

module.exports = class AttrCalc extends Base {

    init () {
        this.view = this.attr.view;
        super.init();
        if (this.attr.defaultValue) {
            this.resolveExpression = this.resolve;
            this.resolve = this.resolveDefaultValue;
        }
    }

    async resolveDefaultValue () {
        const value = await this.resolveExpression(...arguments);
        return value === undefined
            ? this.attr.defaultValue.resolve(...arguments)
            : value;
    }

    resolveToken (model) {
        return this.token.resolve({
            view: model.view,
            user: model.user,
            model
        });
    }

    log () {
        CommonHelper.log(this.attr, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');