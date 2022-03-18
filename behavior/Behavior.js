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
                s3: './S3Behavior',
                signature: './SignatureBehavior',
                sortOrder: './SortOrderBehavior',
                timestamp: './TimestampBehavior',
                trim: './TrimBehavior',
            },
            CUSTOM_TYPE: 'custom'
        };
    }

    static getBuiltIn (name) {
        return this.BUILTIN.hasOwnProperty(name) ? require(this.BUILTIN[name]) : null;
    }

    static getDefaultSpawn () {
        return null;
    }

    static prepareSpawn (data) {
        return data;
    }

    static log (target, type, message, ...args) {
        target.log(type, `${this.name}: ${message}`, ...args);
    }

    static createModelBehaviors (model) {
        model.behaviors = [];
        for (const config of model.view.behaviors) {
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

    module = this.owner.module;

    get () {
        return this.owner.get(...arguments);
    }

    set () {
        return this.owner.set(...arguments);
    }

    getId () {
        return this.owner.getId();
    }

    getOldValue () {
        return this.owner.getOldValue(...arguments);
    }

    getRelated () {
        return this.owner.related.resolve(...arguments);
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

    getSpawnConfig () {
        return this.owner.getSpawnConfig(...arguments);
    }

    async dropData () {
        // override if necessary
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