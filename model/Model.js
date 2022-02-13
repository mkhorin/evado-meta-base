/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Model extends Base {

    static async delete (models) {
        for (const model of models) {
            await model.delete();
        }
    }

    _isNew = true;
    _errorMap = {};
    _valueMap = {};
    _displayValueMap = {};
    _oldValueMap = {};

    constructor (config) {
        super(config);
        this.class = this.view.class;
        this.related = new ModelRelated({model: this});
        this.header = new ModelHeader({model: this});
    }

    hasHistory () {
        return !this._isNew && this.view.behaviors.historyItem;
    }

    isCreator (id) {
        return !this._isNew && JSON.stringify(id) === JSON.stringify(this.getCreator());
    }

    isEditor (id) {
        return !this._isNew && JSON.stringify(id) === JSON.stringify(this.getEditor());
    }

    isId (id) {
        return !this._isNew && JSON.stringify(id) === JSON.stringify(this.getId());
    }

    isNew () {
        return this._isNew;
    }

    getMeta () {
        return this.class.meta;
    }

    getId () {
        return this._valueMap[this.class.getKey()];
    }

    getIdCondition () {
        return {[this.class.getKey()]: this.getId()};
    }

    getNotIdCondition () {
        return ['!=', this.class.getKey(), this.getId()];
    }

    getMetaId () {
        return `${this.getId() || ''}.${this.view.viewName}.${this.class.name}`;
    }

    getEscapedTitle () {
        return EscapeHelper.escapeTags(this.getTitle());
    }

    getTitle () {
        return this.header.toString();
    }

    getCreator () {
        return this._valueMap[this.class.CREATOR_ATTR];
    }

    getEditor () {
        return this._valueMap[this.class.EDITOR_ATTR];
    }

    getCreationDate () {
        return this._valueMap[this.class.CREATED_AT_ATTR];
    }

    getUpdateDate () {
        return this._valueMap[this.class.UPDATED_AT_ATTR];
    }

    getClass () {
        return this.class.meta.getClass(this._valueMap[this.class.CLASS_ATTR]);
    }

    getUserId () {
        return this.user?.getId();
    }

    toString () {
        return this.getMetaId();
    }

    toJSON () {
        const id = this.getId();
        return typeof id?.toJSON === 'function' ? id.toJSON() : id;
    }

    log () {
        CommonHelper.log(this.getMeta(), `${this.constructor.name}: ${this}`, ...arguments);
    }

    // VALUES

    has (attr) {
        return Object.prototype.hasOwnProperty.call(this._valueMap, attr.name || attr);
    }

    get (attr) {
        return this.has(attr) ? this._valueMap[attr.name || attr] : undefined;
    }

    async getNestedValue (key) {
        const index = key.lastIndexOf('.');
        if (index === -1) {
            return this.get(key);
        }
        const related = await this.related.getNestedData(key.substring(0, index));
        key = key.substring(index + 1);
        if (!Array.isArray(related)) {
            return related ? related.get(key) : undefined;
        }
        const result = [];
        for (const model of related) {
            result.push(model.get(key));
        }
        return result;
    }

    set (attr, value) {
        this._valueMap[attr.name || attr] = value;
    }

    setFromModel (name, model) {
        this._valueMap[name] = model.get(name);
    }

    unset (attr) {
        delete this._valueMap[attr.name || attr];
        this.related.unsetChanges(attr);
    }

    assign (data) {
        Object.assign(this._valueMap, data);
    }

    rel (attr) {
        return this.related.get(attr);
    }

    isRelationSorted (attr) {
        const order = this._valueMap[this.class.RELATION_SORTED_ATTR];
        return Array.isArray(order) && order.includes(attr.name || attr);
    }

    getSortedRelationNames () {
        return this._valueMap[this.class.RELATION_SORTED_ATTR];
    }

    getCastedValue (name) {
        const attr = this.view.getAttr(name);
        return attr ? TypeHelper.cast(this.get(name), attr.getCastType()) : this.get(name);
    }

    getValues () {
        return this._valueMap;
    }

    isValueChanged (attr) {
        return !CommonHelper.isEqual(this._valueMap[attr.name || attr], this._oldValueMap[attr.name || attr]);
    }

    setSafeValues (data) {
        if (data) {
            for (const attr of this.view.attrs) {
                this.setSafeValue(attr, data);
                delete data[attr.name];
            }
        }
    }

    setSafeValue (attr, data) {
        if (!attr.canLoad()) {
            return;
        }
        if (Object.prototype.hasOwnProperty.call(data, attr.name)) {
            attr.relation
                ? this.related.setChanges(attr, data[attr.name])
                : this.set(attr, data[attr.name]);
        }
        if (!this.has(attr)) {
            this.set(attr, attr.relation?.multiple ? [] : null);
        }
    }

    hasDisplayValue (attr) {
        return Object.prototype.hasOwnProperty.call(this._displayValueMap, attr.name || attr);
    }

    getDisplayValue (attr) {
        if (!attr.name) {
            attr = this.view.getAttr(attr);
        }
        if (!attr) {
            return;
        }
        if (this.hasDisplayValue(attr)) {
            return this._displayValueMap[attr.name];
        }
        if (attr.embeddedModel) {
            return this.related.getTitle(attr);
        }
        if (attr.enum) {
            return attr.enum.getText(this.get(attr));
        }
        const value = this.header.get(attr);
        if (attr.isStateView()) {
            const state = this.class.getState(value);
            return state ? state.title : value;
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    }

    setDisplayValue (attr, value) {
        this._displayValueMap[attr.name || attr] = value;
    }

    hasOldValue (attr) {
        return Object.prototype.hasOwnProperty.call(this._oldValueMap, attr.name || attr);
    }

    getOldValue (attr) {
        return this.hasOldValue(attr) ? this._oldValueMap[attr.name || attr] : undefined;
    }

    restoreOldValue (attr) {
        const name = attr.name || attr;
        if (this.hasOldValue(attr)) {
            this._valueMap[name] = this._oldValueMap[name];
        } else {
            delete this._valueMap[name];
        }
        this.related.unsetChanges(name);
    }

    setOldValues () {
        this._oldValueMap = {...this._valueMap};
    }

    async setDefaultValues () {
        this.setDefaultState();
        this.set(this.class.CLASS_ATTR, this.class.name);
        this.set(this.class.CREATOR_ATTR, this.getUserId());
        for (const attr of this.view.defaultValueAttrs) {
            this.set(attr, await attr.defaultValue.resolve(this));
        }
        this.ensureBehaviors();
        return Behavior.execute('afterDefaultValues', this);
    }

    async resolveCalcValue (name) {
        const value = await this.view.getAttr(name).calc.resolve(this);
        this.set(name, value);
        return value;
    }

    async resolveCalcValues () {
        for (const attr of this.view.calcAttrs) {
            this.set(attr, await attr.calc.resolve(this));
        }
    }

    getMasterModel () {
        return this.controller.meta.master.model;
    }

    setUser (user) {
        this.user = user;
    }

    populate (data) {
        Object.assign(this._valueMap, data);
        this._isNew = false;
        this.setOldValues();
    }

    findSelf () {
        return this.class.createQuery(this.getSpawnConfig()).byId(this.getId());
    }

    createSelf (params) {
        return this.createByView(this.view, params);
    }

    createByView (view, params) {
        return view.createModel(this.getSpawnConfig(params));
    }

    getSpawnConfig (params) {
        return {
            module: this.module,
            user: this.user,
            ...params
        };
    }

    clone (sample) {
        for (const attr of this.view.attrs) {
            if (attr.canLoad()) {
                this.set(attr, sample.get(attr));
            }
        }
    }

    resolveReadOnlyAttrTitles () {
        for (const attr of this.view.headerAttrs) {
            if (this.readOnly || attr.isReadOnly()) {
                this.header.resolveAttr(attr);
            }
        }
    }

    emit (event, data) {
        return this.class.meta.emit(event, {model: this, ...data});
    }

    // BEHAVIOR

    getBehaviorsByClass (Class) {
        this.ensureBehaviors();
        const result = [];
        for (const behavior of this.behaviors) {
            if (behavior instanceof Class) {
                result.push(behavior);
            }
        }
        return result;
    }

    ensureBehaviors () {
        if (!this.behaviors) {
            Behavior.createModelBehaviors(this);
        }
    }

    createFileBehavior () {
        return this.view.behaviors.fileItem
            ? this.createBehavior(this.view.behaviors.fileItem)
            : null;
    }

    createSignatureBehavior () {
        return !this._isNew && this.view.behaviors.signatureItem
            ? this.createBehavior(this.view.behaviors.signatureItem)
            : null;
    }

    createBehavior (config) {
        config.owner = this;
        return new config.Class(config);
    }

    // VALIDATION

    ensureValidators () {
        if (!this.validators) {
            this.validators = Validator.createValidators(this.view);
        }
        return this.validators;
    }

    async validate () {
        this.clearErrors();
        await this.related.resolveChanges();
        await Behavior.execute('beforeValidate', this);
        await Validator.validateModel(this);
        this.castValues();
        await Behavior.execute('afterValidate', this);
        return !this.hasError();
    }

    castValues () {
        for (const attr of this.view.getAttrs()) {
            const classAttr = this.class.getAttr(attr.name);
            if (classAttr && !attr.isReadOnly() && !classAttr.isReadOnly()) {
                this.set(attr, TypeHelper.cast(this.get(attr), attr.getCastType()));
            }
        }
    }

    getValidators (attrName, type) {
        const validators = [];
        for (const validator of this.ensureValidators()) {
            if ((!attrName || validator.hasAttr(attrName)) && (!type || validator.type === type)) {
                validators.push(validator);
            }
        }
        return validators;
    }

    // SAVE

    load (data, excepts) {
        ObjectHelper.deleteProperties(excepts, data);
        this.setSafeValues(data);
        Object.assign(this._valueMap, data);
        return this;
    }

    async save () {
        if (!await this.validate()) {
            return false;
        }
        await this.forceSave();
        return true;
    }

    forceSave () {
        return this._isNew ? this.insert() : this.update();
    }

    async insert () {
        await this.beforeInsert();
        const id = await this.class.insert(this._valueMap);
        this.set(this.class.getKey(), id);
        await this.afterInsert();
        this.setOldValues();
    }

    async beforeInsert () {
        await this.beforeSave(true);
        await Behavior.execute('beforeInsert', this);
        this.set(this.class.CREATOR_ATTR, this.getUserId());
    }

    async afterInsert () {
        await this.afterSave(true);
        await Behavior.execute('afterInsert', this);
        await this.emit(`create.${this.class.name}`);
        this._isNew = false;
    }

    async update () {
        await this.beforeUpdate();
        await this.directUpdate();
        await this.afterUpdate();
        this.setOldValues();
    }

    directUpdate () {
        return this.class.update(this.getId(), this._valueMap);
    }

    async beforeUpdate () {
        await this.beforeSave();
        await Behavior.execute('beforeUpdate', this);
        this.set(this.class.EDITOR_ATTR, this.getUserId());
    }

    async afterUpdate () {
        await this.afterSave();
        await Behavior.execute('afterUpdate', this);
        await this.emit(`update.${this.class.name}`);
    }

    async beforeSave () {
        await this.related.resolveChanges();
    }

    async afterSave () {
        await this.related.changeBackRefs();
        await this.related.onUpdateModel();
    }

    // DELETE

    async delete () {
        this.clearErrors();
        await this.beforeDelete();
        if (!this.hasError()) {
            await this.findSelf().delete();
            await this.afterDelete();
        }
    }

    async beforeDelete () {
        await this.related.onBeforeDeleteModel();
        await Behavior.execute('beforeDelete', this);
    }

    async afterDelete () {
        await this.related.onAfterDeleteModel();
        await Behavior.execute('afterDelete', this);
        await this.emit(`delete.${this.class.name}`);
    }

    // ERRORS

    hasError (attrName) {
        return attrName !== undefined
            ? Object.prototype.hasOwnProperty.call(this._errorMap, attrName)
            : Object.values(this._errorMap).length > 0;
    }

    getErrors (attrName) {
        return !attrName ? this._errorMap : this.hasError(attrName) ? this._errorMap[attrName] : [];
    }

    getFirstError (attrName) {
        if (attrName) {
            return this.hasError(attrName) ? this._errorMap[attrName][0] : '';
        }
        for (const error of Object.values(this._errorMap)) {
            if (error.length) {
                return error[0];
            }
        }
        return '';
    }

    getFirstErrorMap () {
        const errors = {};
        for (const attr of Object.keys(this._errorMap)) {
            if (this._errorMap[attr].length) {
                errors[attr] = this._errorMap[attr][0];
            }
        }
        return errors;
    }

    addError (attrName, error) {
        if (!this.hasError(attrName)) {
            this._errorMap[attrName] = [];
        }
        this._errorMap[attrName].push(error);
    }

    addErrors (items) {
        for (const name of Object.keys(items)) {
            if (Array.isArray(items[name])) {
                for (const error of items[name]) {
                    this.addError(name, error);
                }
            } else {
                this.addError(name, items[name]);
            }
        }
    }

    clearErrors (attrName) {
        attrName ? delete this._errorMap[attrName] : this._errorMap = {};
    }

    // WORKFLOW

    isReadOnlyState () {
        if (this.view.isReadOnly()) {
            return true;
        }
        const state = this.getState();
        if (state) {
            return state.isReadOnly();
        }
    }

    isTransiting () {
        return !!this.getTransitionName();
    }

    getState () {
        return this.class.getState(this.getStateName());
    }

    getStateName () {
        return this._valueMap[this.class.STATE_ATTR];
    }

    getTransition () {
        return this.class.getTransition(this.getTransitionName());
    }

    getTransitionName () {
        return this._valueMap[this.class.TRANSITING_ATTR];
    }

    setDefaultState () {
        if (this.class.defaultState && !this.getState()) {
            this.setState(this.class.defaultState.name);
        }
    }

    setState (name) {
        this.set(this.class.STATE_ATTR, name);
    }

    async resolveTransitions (name) {
        this.transitions = [];
        const transitions = this.class.getStartStateTransitions(this.getState());
        if (Array.isArray(transitions)) {
            for (const transition of transitions) {
                if (!name || transition.name === name) {
                    if (await transition.resolveCondition(this)) {
                        this.transitions.push(transition);
                    }
                }
            }
        }
    }

    async transit (transition) {
        const startState = this.getStateName();
        try {
            await this.updateTransiting(transition.name);
            const transit = transition.createTransit(this);
            await this.beforeTransit(transit);
            if (this.hasError()) {
                return this.updateTransiting(null);
            }
            const state = await transit.start();
            await this.updateState(state);
            this.log('info', `Transit done: ${transition.name}`);
        } catch (err) {
            const message = `Transit failed: ${transition.name}`;
            this.log('error', message, err);
            this.addError(this.class.TRANSITING_ATTR, message);
            return this.updateTransiting(null);
        }
        try {
            await this.updateTransiting(null);
            await this.afterTransit({transition, startState});
        } catch (err) {
            this.log('error', `Failed after transit: ${transition.name}`, err);
        }
    }

    beforeTransit (transit) {
        return Behavior.execute('beforeTransit', this, transit);
    }

    async afterTransit (transition) {
        await Behavior.execute('afterTransit', this, transition);
        await this.emit(`transit.${this.class.name}.${transition.name}`, {transition});
    }

    updateTransiting (value) {
        this.set(this.class.TRANSITING_ATTR, value);
        return this.findSelf().update({[this.class.TRANSITING_ATTR]: value});
    }

    updateState (name) {
        this.setState(name);
        return this.findSelf().update({
            [this.class.STATE_ATTR]: name,
            [this.class.UPDATED_AT_ATTR]: new Date
        });
    }

    // OUTPUT

    output (config) {
        return (new ModelOutput({model: this, ...config})).output();
    }
};

const CommonHelper = require('areto/helper/CommonHelper');
const EscapeHelper = require('areto/helper/EscapeHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const Behavior = require('../behavior/Behavior');
const Validator = require('../validator/Validator');
const ModelRelated = require('./ModelRelated');
const ModelHeader = require('./ModelHeader');
const ModelOutput = require('./ModelOutput');
const TypeHelper = require('../helper/TypeHelper');