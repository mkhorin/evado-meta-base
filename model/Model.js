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

    isNew () {
        return this._isNew;
    }

    getMeta () {
        return this.class.meta;
    }

    getId () {
        return this._valueMap[this.class.getKey()];
    }

    getViewMetaId () {
        return `${this.getId() || ''}.${this.view.getViewId()}`;
    }

    getClassMetaId () {
        return `${this.getId() || ''}.${this.class.id}`;
    }

    getEscapedTitle () {
        return EscapeHelper.escapeTags(this.header);
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

    getCreateDate () {
        return this._valueMap[this.class.CREATED_AT_ATTR];
    }

    getUpdateDate () {
        return this._valueMap[this.class.UPDATED_AT_ATTR];
    }

    hasHistory () {
        return !this._isNew && this.view.historyAttrs.length;
    }

    getClass () {
        return this.class.meta.getClass(this._valueMap[this.class.CLASS_ATTR]);
    }

    getUserId () {
        return this.user ? this.user.getId() : null;
    }

    toString () {
        return this.getViewMetaId();
    }

    toJSON () {
        const id = this.getId();
        return id && id.toJSON ? id.toJSON() : id;
    }

    log () {
        CommonHelper.log(this.getMeta(), `${this.constructor.name}: ${this}`, ...arguments);
    }

    // VALUES

    has (attr) {
        return Object.prototype.hasOwnProperty.call(this._valueMap, attr.name || attr);
    }

    get (attr) {
        attr = attr.name || attr;
        if (Object.prototype.hasOwnProperty.call(this._valueMap, attr)) {
            return this._valueMap[attr];
        }
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

    hasRelationOrder (attr) {
        const order = this._valueMap[this.class.RELATION_SORT_ATTR];
        return Array.isArray(order) && order.includes(attr.name || attr);
    }

    getRelationOrder () {
        return this._valueMap[this.class.RELATION_SORT_ATTR];
    }

    getCastedValue (name) {
        const attr = this.view.getAttr(name);
        return attr ? TypeHelper.cast(this.get(name), attr.getCastType()) : this.get(name);
    }

    getValues () {
        return this._valueMap;
    }

    isValueChanged (attr) {
        return !CommonHelper.isEqual(this._valueMap[attr.name], this._oldValueMap[attr.name]);
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
            return false;
        }
        if (Object.prototype.hasOwnProperty.call(data, attr.name)) {
            attr.relation
                ? this.related.setChanges(attr, data[attr.name])
                : this.set(attr, data[attr.name]);
        }
        if (!this.has(attr)) {
            this.set(attr, attr.relation && attr.relation.multiple ? [] : null);
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
            return undefined;
        }
        if (this.hasDisplayValue(attr)) {
            return this._displayValueMap[attr.name];
        }
        if (attr.embeddedModel) {
            return this.related.getTitle(attr);
        }
        const value = this.header.get(attr);
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    }

    setDisplayValue (attr, value) {
        this._displayValueMap[attr.name || attr] = value;
    }

    getOldValue (attr) {
        attr = attr.name || attr;
        if (Object.prototype.hasOwnProperty.call(this._oldValueMap, attr)) {
            return this._oldValueMap[attr];
        }
    }

    restoreOldValue (attr) {
        attr = attr.name || attr;
        if (Object.prototype.hasOwnProperty.call(this._oldValueMap, attr)) {
            this._valueMap[attr] = this._oldValueMap[attr];
        } else {
            delete this._valueMap[attr];
        }
        this.related.unsetChanges(attr);
    }

    setOldValues () {
        this._oldValueMap = {...this._valueMap};
    }

    async setDefaultValues () {
        this.set(this.class.CLASS_ATTR, this.class.name);
        this.set(this.class.CREATOR_ATTR, this.user.getId());
        for (const attr of this.view.defaultValueAttrs) {
            this.set(attr, await attr.defaultValue.resolve(this));
        }
        this.ensureBehaviors();
        return Behavior.execute('afterDefaultValues', this);
    }

    async resolveCalc () {
        for (const attr of this.view.calcAttrs) {
            this.set(attr, await attr.calc.resolve(this));
        }
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
        return this.class.findById(this.getId(), {
            module: this.module,
            user: this.user
        });
    }

    createSelf (params) {
        return this.createByView(this.view, params);
    }

    createByView (view, params) {
        return view.createModel({
            module: this.module,
            user: this.user,
            ...params
        });
    }

    clone (sample) {
        for (const attr of this.view.attrs) {
            if (attr.canLoad()) {
                this.set(attr, sample.get(attr));
            }
        }
    }

    // BEHAVIORS

    getFileBehavior () {
        return this.getBehaviorsByClass(FileBehavior)[0];
    }

    getBehaviorsByClass (Class) {
        this.ensureBehaviors();
        return ArrayHelper.filterByClassProperty(this.behaviors, Class);
    }

    ensureBehaviors () {
        if (!this.behaviors) {
            Behavior.createModelBehaviors(this);
        }
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
        this.set(this.class.CREATOR_ATTR, this.user.getId());
        this.setDefaultState();
    }

    async afterInsert () {
        await this.afterSave(true);
        await Behavior.execute('afterInsert', this);
        this._isNew = false;
    }

    async update () {
        await this.beforeUpdate();
        await this.class.update(this.getId(), this._valueMap);
        await this.afterUpdate();
        this.setOldValues();
    }

    async beforeUpdate () {
        await this.beforeSave();
        await Behavior.execute('beforeUpdate', this);
        this.unset(this.class.CREATOR_ATTR);
        this.set(this.class.EDITOR_ATTR, this.user.getId());
    }

    async afterUpdate () {
        await this.afterSave();
        await Behavior.execute('afterUpdate', this);
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
        await this.beforeDelete();
        if (!this.hasError()) {
            await this.findSelf().delete();
            await this.afterDelete();
        }
    }

    beforeDelete () {
        return Behavior.execute('beforeDelete', this);
    }

    async afterDelete () {
        await this.related.onDeleteModel();
        return Behavior.execute('afterDelete', this);
    }

    // ERRORS

    hasError (attrName) {
        return attrName
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

    isTransiting () {
        return !!this.getTransitionName();
    }

    isReadOnlyState () {
        const state = this.getState();
        return state && state.isReadOnly();
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
            this.set(this.class.STATE_ATTR, this.class.defaultState.name);
        }
    }

    async resolveTransitions () {
        this.transitions = [];
        const transitions = this.class.getStartStateTransitions(this.getState());
        if (Array.isArray(transitions)) {
            for (const transition of transitions) {
                if (await transition.resolveCondition(this)) {
                    this.transitions.push(transition);
                }
            }
        }
    }

    async transit (transition) {
        try {
            await this.updateTransiting(transition.name);
            const transit = transition.createTransit(this);
            await Behavior.execute('beforeTransit', this, transit);
            if (this.hasError()) {
                return this.updateTransiting(null);
            }
            const state = await transit.execute();
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
            await Behavior.execute('afterTransit', this, transition);
        } catch (err) {
            this.log('error', `After transit failed: ${transition.name}`, err);
        }
    }

    updateTransiting (value) {
        this.set(this.class.TRANSITING_ATTR, value);
        return this.findSelf().update({[this.class.TRANSITING_ATTR]: value});
    }

    updateState (value) {
        this.set(this.class.STATE_ATTR, value);
        return this.findSelf().update({[this.class.STATE_ATTR]: value});
    }

    // OUTPUT

    output (security = this.security) {
        const access = security && security.attrAccess;
        const result = {};
        const forbidden = this.forbiddenReadAttrs;
        for (const attr of this.view.attrs) {
            if ((!access || access.canRead(attr.name)) && (!forbidden || !forbidden.includes(attr.name))) {
                result[attr.name] = this.outputAttr(attr, result);
            } else if (result._forbidden) {
                result._forbidden.push(attr.name);
            } else {
                result._forbidden = [attr.name];
            }
        }
        result._id = this.getId();
        result._metaClass = this.class.name;
        result._title = this.getTitle();
        return result;
    }

    outputAttr (attr, result) {
        if (attr.relation) {
            return this.outputRelationAttr(attr);
        }
        if (attr.embeddedModel) {
            this.setOutputAttrTitle(this.related.getTitle(attr), attr, result);
            return this.get(attr);
        }
        if (attr.enum) {
            const value = this.get(attr);
            this.setOutputAttrTitle(attr.enum.getText(value), attr, result);
            return value;
        }
        if (attr.isState()) {
            const value = this.get(attr);
            const state = this.class.getState(value);
            if (state) {
                this.setOutputAttrTitle(state.title, attr, result);
            }
            return value;
        }
        const value = this.header.get(attr);
        return value instanceof Date ? value.toISOString() : value;
    }

    outputRelationAttr (attr) {
        const related = this.related.get(attr);
        if (!Array.isArray(related)) {
            return related ? related.output() : this.get(attr);
        }
        const result = [];
        for (const model of related) {
            result.push(model.output());
        }
        return result;
    }

    setOutputAttrTitle (value, attr, result) {
        result[`${attr.name}_title`] = value;
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const EscapeHelper = require('areto/helper/EscapeHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const Behavior = require('../behavior/Behavior');
const Validator = require('../validator/Validator');
const FileBehavior = require('../behavior/FileBehavior');
const ModelRelated = require('./ModelRelated');
const ModelHeader = require('./ModelHeader');
const TypeHelper = require('../helper/TypeHelper');