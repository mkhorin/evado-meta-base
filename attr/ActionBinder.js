/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ActionBinder extends Base {

    static getConstants () {
        return {
            ACTION_SHOW: 'show',
            ACTION_REQUIRE: 'require',
            ACTION_ENABLE: 'enable',
            ACTION_VALUE: 'value'
        };
    }

    constructor (config) {
        super(config);
        this.actionData = this.getActionData();
        this.stringified = this.actionData ? JSON.stringify(this.actionData) : '';
        this.createVerifiableActions();
    }

    getActionData () {
        if (!this.data) {
            return;
        }
        return {
            [this.ACTION_SHOW]: this.data[this.ACTION_SHOW],
            [this.ACTION_REQUIRE]: this.data[this.ACTION_REQUIRE],
            [this.ACTION_ENABLE]: this.data[this.ACTION_ENABLE],
            [this.ACTION_VALUE]: this.data[this.ACTION_VALUE]
        };
    }

    createVerifiableActions () {
        this._verifiableActions = {};
        this.createVerifiableAction(this.ACTION_REQUIRE);
        this.createVerifiableAction(this.ACTION_ENABLE);
    }

    createVerifiableAction (name) {
        if (this.actionData?.[name]) {
            this._verifiableActions[name] = new Action({
                binder: this,
                data: this.actionData[name],
                name
            });
        }
    }

    hasGroupActions () {
        return this.hasVerifiableActions();
    }

    hasVerifiableActions () {
        return Object.values(this._verifiableActions).length > 0;
    }

    validateAction (name, model) {
        return this._verifiableActions[name]
            ? this._verifiableActions[name].validate(model)
            : true;
    }

    addRequireDataTo (target) {
        this.addActionDataTo(target, this.ACTION_REQUIRE, 'or');
    }

    addEnableDataTo (target) {
        this.addActionDataTo(target, this.ACTION_ENABLE, 'and');
    }

    addActionDataTo (target, action, operator) {
        if (this.actionData[action]) {
            const result = target.actionBinder || {};
            result[action] = result[action]
                ? [operator, result[action], this.actionData[action]]
                : this.actionData[action];
            target.actionBinder = result;
        }
    }

    log () {
        CommonHelper.log(this.owner, this.constructor.name, ...arguments);
    }
};
module.exports.init();

const CommonHelper = require('areto/helper/CommonHelper');
const Action = require('./Action');