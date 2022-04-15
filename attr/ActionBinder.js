/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ActionBinder extends Base {

    constructor (config) {
        super(config);
        this.actionData = this.getActionData();
        this.stringified = this.actionData ? JSON.stringify(this.actionData) : '';
        this.createActions();
    }

    getActionData () {
        if (!this.data) {
            return null;
        }
        return {
            show: this.data.show,
            require: this.data.require,
            enable: this.data.enable,
            value: this.data.value
        };
    }

    createActions () {
        this._actionMap = {};
        this.createAction('require');
        this.createAction('enable');
    }

    createAction (name) {
        if (this.actionData?.[name]) {
            this._actionMap[name] = new Action({
                name,
                data: this.actionData[name],
                binder: this
            });
        }
    }

    isActions () {
        return Object.values(this._actionMap).length > 0;
    }

    validateAction (name, model) {
        return this._actionMap[name] ? this._actionMap[name].validate(model) : true;
    }

    log () {
        CommonHelper.log(this.owner, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');
const Action = require('./Action');