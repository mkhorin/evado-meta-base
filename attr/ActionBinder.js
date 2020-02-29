/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ActionBinder extends Base {

    constructor (config) {
        super(config);
        this.stringified = this.data ? JSON.stringify(this.data) : '';
        this.createActions();
    }

    createActions () {
        this._actionMap = {};
        this.createAction('require');
    }

    createAction (name) {
        if (this.data && this.data[name]) {
            this._actionMap[name] = new Action({
                name,
                data: this.data[name],
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