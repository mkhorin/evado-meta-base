/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Transition extends Base {

    constructor (config) {
        super(config);
        this.name = this.data.name;
        this.id = `${this.name}.${this.class.id}`;
        this.label = MetaHelper.createLabel(this);
        this.title = this.label;
        this.hint = this.data.hint;
        this.nullStartState = this.data.nullStartState;
        this.startStates = this.resolveStates(this.data.startStates);
        this.finalState = this.class.getState(this.data.finalState);
        this.options = this.data.options || {};
        this.translationKey = `${this.class.translationKey}.transition.${this.name}`;
        this.createCondition();
        this.createTransitConfig();
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

    hasStartState (name) {
        for (const state of this.startStates) {
            if (state.name === name) {
                return true;
            }
        }
        return false;
    }

    getFinalStateName () {
        return this.finalState ? this.finalState.name : null;
    }

    resolveStates (names) {
        if (!Array.isArray(names)) {
            return [];
        }
        const states = names.map(name => this.class.getState(name));
        return states.filter(v => !!v);
    }

    createCondition () {
        try {
            this._condition = Condition.prepareSpawn(this.data.condition, this.class);
        } catch (err) {
            this.log('error', 'Invalid condition configuration', err);
        }
    }

    resolveCondition (model) {
        const config = this._condition;
        return config ? (new config.Class(config)).resolve(model) : true;
    }

    createTransitConfig () {
        this._config = this.class.meta.resolveSpawn(Transit, this.data.config);
        if (!this._config) {
            this.log('error', 'Invalid transit configuration');
        }
    }

    createTransit (model) {
        return model.spawn(this._config, {transition: this, model});
    }

    log () {
        CommonHelper.log(this.class.meta, `${this.constructor.name}: ${this.id}`, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');
const Condition = require('../condition/Condition');
const MetaHelper = require('../helper/MetaHelper');
const NestedHelper = require('areto/helper/NestedHelper');
const Transit = require('./Transit');
