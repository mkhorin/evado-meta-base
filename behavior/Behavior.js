/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Behavior extends Base {

    static getConstants () {
        return {
            BUILTIN: {
                assignedValue: './AssignedValueBehavior',
                autoIncrement: './AutoIncrementBehavior',
                file: './FileBehavior',
                guid: './GuidBehavior',
                history: './DataHistoryBehavior',
                sortOrder: './SortOrderBehavior',
                timestamp: './TimestampBehavior',
                trim: './TrimBehavior',
            },
            CUSTOM_BEHAVIOR_TYPE: 'custom'
        };
    }

    static createConfigurations (owner) {
        const items = owner.data.behaviors;
        if (!Array.isArray(items)) {
            return null;
        }
        for (const item of items) {
            const data = this.createConfiguration(owner, item);
            data ? this.appendConfiguration(owner, data)
                 : owner.log('error', 'Invalid behavior configuration:', item);
        }
    }

    static initConfiguration () {
        // override if necessary
    }

    static appendConfiguration (owner, data) {
        data.Class.initConfiguration(data);
        ObjectHelper.push(data, 'behaviors', owner);
        return data;
    }

    static createConfiguration (owner, data) {
        if (!data) {
            return null;
        }
        if (this.BUILTIN.hasOwnProperty(data)) {
            return {Class: require(this.BUILTIN[data])};
        }
        if (data.type === this.CUSTOM_BEHAVIOR_TYPE) {
            return owner.getMeta().resolveSpawn(data.config);
        }
        if (this.BUILTIN.hasOwnProperty(data.type)) {
            return {...data, Class: require(this.BUILTIN[data.type])};
        }
    }

    static createModelBehaviors (model) {
        model.behaviors = [];
        if (model.view.behaviors) {
            this.createModelBehaviorsByData(model.view.behaviors, model);
        }
        if (model.view !== model.class && model.class.behaviors) {
            this.createModelBehaviorsByData(model.class.behaviors, model);
        }
    }

    static createModelBehaviorsByData (data, model) {
        for (const config of data) {
            config.owner = model;
            model.behaviors.push(ClassHelper.spawn(config));
        }
    }

    static async execute (method, model) {
        model.ensureBehaviors();
        for (const behavior of model.behaviors) {
            if (behavior[method] instanceof Function) {
                await behavior[method]();
            }
        }
    }

    static async dropData (view) {
        if (Array.isArray(view.behaviors)) {
            const owner = view.spawnModel();
            for (const config of view.behaviors) {
                await ClassHelper.spawn(config, {owner}).dropData();
            }
        }
    }

    module = this.owner.module;

    getMeta () {
        return this.owner.getMeta();
    }

    getClassAttr () {
        return this.owner.class.getAttr(this.attrName);
    }

    getViewAttr () {
        return this.owner.view.getAttr(this.attrName);
    }

    emitEvent (name, data) {
        return this.owner.getMeta().emitEvent(name, {model: this.owner, ...data});
    }

    // beforeValidate
    // afterValidate

    // beforeInsert

    afterInsert () {
        return this.emitEvent('afterInsert');
    }

    // beforeUpdate

    afterUpdate () {
        return this.emitEvent('afterUpdate');
    }

    // beforeDelete

    afterDelete () {
        return this.emitEvent('afterDelete');
    }

    // beforeTransit
    
    afterTransit () {        
        return this.emitEvent('afterTransit');
    }

    dropData () {
    }
};
module.exports.init();

const ClassHelper = require('areto/helper/ClassHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');