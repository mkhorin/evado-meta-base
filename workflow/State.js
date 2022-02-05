/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class State extends Base {

    constructor (config) {
        super(config);
        this.name = this.data.name;
        this.view = this.class.getView(this.data.view);
        this.label = MetaHelper.createLabel(this);
        this.title = this.label;
        this.id = `${this.name}.${this.view ? this.view.id : this.class.id}`;
        this.options = this.data.options || {};
    }

    isDeadEnd () {
        return this.deadEnd;
    }

    isDefault () {
        return this.data.defaults;
    }

    isReadOnly () {
        return this.data.readOnly;
    }

    getName () {
        return this.name;
    }

    getTitle () {
        return this.title;
    }

    getOption (key, defaults) {
        return NestedHelper.get(key, this.options, defaults);
    }

    toString () {
        return this.id;
    }

    resolveDeadEnd (transitions) {
        this.deadEnd = true;
        for (const transition of transitions) {
            if (transition.hasStartState(this.name)) {
                this.deadEnd = false;
            }
        }
    }
};

const MetaHelper = require('../helper/MetaHelper');
const NestedHelper = require('areto/helper/NestedHelper');