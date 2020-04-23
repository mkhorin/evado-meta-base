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
        this.title = MetaHelper.createLabel(this);
        this.hint = this.data.hint;
        this.nullStartState = this.data.nullStartState;
        this.startStates = this.resolveStates(this.data.startStates);
        this.finalState = this.class.getState(this.data.finalState);
        this.options = this.data.options || {};
        this.translationKey = `${this.class.translationKey}.transition.${this.name}`;
        this.createCondition();
        this.createTransitConfig();
    }

    hasStartState (name) {
        for (const state of this.startStates) {
            if (state.name === name) {
                return true;
            }
        }
        return false;
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

    getFinalStateName () {
        return this.finalState ? this.finalState.name : null;
    }

    resolveStates (names) {
        let states = Array.isArray(names) ? names.map(name => this.class.getState(name)) : [];
        states = states.filter(state => state);
        return states.length ? states : null;
    }

    createCondition () {
        const data = this.data.condition;
        if (data) {
            this.condition = data.Class
                ? this.class.meta.resolveSpawn(data)
                : data;
        }
    }

    resolveCondition (model) {
        if (!this.condition) {
            return true;
        }
        if (this.condition.Class) {
            const condition = model.spawn(this.condition, {transition: this});
            return condition.resolve(model);
        }
        return model.findSelf().and(this.condition).count();
    }

    createTransitConfig () {
        this.config = this.class.meta.resolveSpawn(Transit, this.data.config);
        if (!this.config) {
            this.class.log('error', 'Invalid transit configuration');
        }
    }

    createTransit (model) {
        return model.spawn(this.config, {transition: this, model});
    }
};

const MetaHelper = require('../helper/MetaHelper');
const NestedHelper = require('areto/helper/NestedHelper');
const Transit = require('./Transit');