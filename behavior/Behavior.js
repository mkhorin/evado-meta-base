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

    static createConfigurations (view) {
        const items = [].concat(view.attrBehaviors);
        if (Array.isArray(view.data.behaviors)) {
            items.push(...view.data.behaviors);
        }
        for (const item of items) {
            const data = this.createConfiguration(view, item);
            data ? this.appendConfiguration(view, data)
                 : view.log('error', 'Invalid behavior configuration:', item);
        }
    }

    static initConfiguration () {
        // override if necessary
    }

    static appendConfiguration (view, data) {
        data.Class.initConfiguration(data);
        ObjectHelper.push(data, 'behaviors', view);
        return data;
    }

    static createConfiguration (view, data) {
        if (!data) {
            return null;
        }
        if (this.BUILTIN.hasOwnProperty(data)) {
            return {
                Class: require(this.BUILTIN[data]),
                orderNumber: 0
            };
        }
        if (data.type === this.CUSTOM_BEHAVIOR_TYPE) {
            data.config.orderNumber = data.config.orderNumber || data.orderNumber || 0;
            return view.getMeta().resolveSpawn(data.config);
        }
        if (this.BUILTIN.hasOwnProperty(data.type)) {
            data.orderNumber = data.orderNumber || 0;
            return {...data, Class: require(this.BUILTIN[data.type])};
        }
    }

    static appendClassBehaviors (view) {
        if (view.class.behaviors) {
            view.behaviors = view.behaviors || [];
            view.behaviors.push(...view.class.behaviors);
        }
    }

    static setAfterFindBehaviors (view) {
        view.afterFindBehaviors = this.getBehaviorsByMethod('afterFind', view);
    }

    static setAfterPopulateBehaviors (view) {
        view.afterPopulateBehaviors = this.getBehaviorsByMethod('afterPopulate', view);
    }

    static getBehaviorsByMethod (name, view) {
        if (view.behaviors) {
            const result = view.behaviors.filter(behavior => typeof behavior.Class.prototype[name] === 'function');
            return result.length ? result : null;
        }
    }

    static sort (view) {
        if (view.behaviors) {
            MetaHelper.sortByOrderNumber(view.behaviors);
        }
    }

    static createModelBehaviors (model) {
        model.behaviors = [];
        if (model.view.behaviors) {
            this.createModelBehaviorsByData(model.view.behaviors, model);
        }
    }

    static createModelBehaviorsByData (data, model) {
        for (const config of data) {
            config.owner = model;
            model.behaviors.push(new config.Class(config));
        }
    }

    static async execute (method, model, ...args) {
        model.ensureBehaviors();
        for (const behavior of model.behaviors) {
            if (typeof behavior[method] === 'function') {
                await behavior[method](...args);
            }
        }
    }

    static async dropData (view) {
        if (Array.isArray(view.behaviors)) {
            const owner = view.createModel();
            for (const config of view.behaviors) {
                await ClassHelper.spawn(config, {owner}).dropData();
            }
        }
    }

    module = this.owner.module;

    get () {
        return this.owner.get(...arguments);
    }

    getRelated () {
        return this.owner.related.resolve(...arguments);
    }

    set () {
        return this.owner.set(...arguments);
    }

    getMeta () {
        return this.owner.class.meta;
    }

    getMetadataClass (name) {
        return this.owner.class.meta.getClass(name);
    }

    getClassAttr () {
        return this.owner.class.getAttr(this.attrName);
    }

    getViewAttr () {
        return this.owner.view.getAttr(this.attrName);
    }

    dropData () {
    }

    // afterDefaultValues
    // afterPopulate
    // afterFind

    // beforeValidate
    // afterValidate

    // beforeInsert
    // afterInsert

    // beforeUpdate
    // afterUpdate

    // beforeDelete
    // afterDelete

    // beforeTransit
    // afterTransit
};
module.exports.init();

const ClassHelper = require('areto/helper/ClassHelper');
const MetaHelper = require('../helper/MetaHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');