/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ViewAttr extends Base {

    static getConstants () {
        return {
            SKIP_INHERITANCE: [
                'behaviors',
                'defaultValue',
                'enums',
                'expression',
                'multiple',
                'refAttr',
                'refClass',
                'linkAttr',
                'validators'
            ],
            DEFAULT_EAGER_DEPTH: 1,
            DEFAULT_SEARCH_DEPTH: 1,
            MAX_EAGER_DEPTH: 10,
            MAX_SEARCH_DEPTH: 10
        };
    }

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        this.name = this.data.name;
        this.id = `${this.name}.${this.view.id}`;
        this.classAttr = this.class.getAttr(this.name);
        this.type = this.classAttr.type;
        this.embeddedModel = this.classAttr.embeddedModel;
        this.templateKey = `_attr/${this.class.name}/${this.view.basename}/${this.name}`;
        this.parentTemplateKey = `_attr/${this.class.name}/${this.name}`;
        this.translationKey = `${this.classAttr.translationKey}.view.${this.view.name}`;
        this.assignDataFromClassAttr();
        this.viewType = this.data.viewType || this.type;
        this.initCommon();
    }

    initCommon () {
        this.title = MetaHelper.createLabel(this);
        this.hint = this.data.hint;
        this.extHint = this.data.extHint;
        this.options = this.data.options || {};
        if (this.options.format === undefined) {
            this.options.format = this.getDefaultFormat();
        }
        if (MetaHelper.isSystemName(this.name) || this.isCalc()) {
            this.data.readOnly = true;
        }
        this.searchDepth = this.resolveSearchDepth();
        this.eagerDepth = this.resolveEagerDepth();
        this.escaping = this.data.escape && (this.isString() || this.isText() || this.isRelation());
        this.readOnly = this.data.readOnly === true;
        this.required = this.data.required === true;
        this.unique = this.data.unique === true;
        this.sortable = this.data.sortable === true;
    }

    isBoolean () {
        return this.type === TypeHelper.TYPES.BOOLEAN;
    }

    isCalc () {
        return this.type === TypeHelper.TYPES.CALC;
    }

    isDate () {
        return this.type === TypeHelper.TYPES.DATE;
    }

    isFile () {
        return this.type === TypeHelper.TYPES.FILE;
    }

    isFileBehavior () {
        return this.class.FileBehaviorConfig && this.class.FileBehaviorConfig.attrName === this.name;
    }

    isGroup () {
        return false;
    }

    isHidden () {
        return this.data.hidden === true;
    }

    isNumber () {
        return this.type === TypeHelper.TYPES.INTEGER || this.type === TypeHelper.TYPES.FLOAT;
    }

    isString () {
        return this.type === TypeHelper.TYPES.STRING;
    }

    isText () {
        return this.type === TypeHelper.TYPES.TEXT;
    }

    isRef () {
        return this.type === TypeHelper.TYPES.REF;
    }

    isBackRef () {
        return this.type === TypeHelper.TYPES.BACK_REF;
    }

    isRelation () {
        return this.type === TypeHelper.TYPES.REF || this.type === TypeHelper.TYPES.BACK_REF;
    }

    isClass () {
        return this.viewType === TypeHelper.VIEW_TYPES.CLASS;
    }

    isState () {
        return this.viewType === TypeHelper.VIEW_TYPES.STATE;
    }

    isTime () {
        return this.viewType === TypeHelper.VIEW_TYPES.TIME;
    }

    isThumbnail () {
        return this.viewType === TypeHelper.VIEW_TYPES.THUMBNAIL;
    }

    isUTC () { // universal date
        return this.viewType === TypeHelper.VIEW_TYPES.DATE
            || this.viewType === TypeHelper.VIEW_TYPES.DATETIME;
    }

    isEagerLoading () {
        return this.data.eagerLoading;
    }

    isEmbeddedModel () {
        return !!this.embeddedModel;
    }

    isUser () {
        return this.type === TypeHelper.TYPES.USER;
    }

    isReadOnly () {
        return this.readOnly;
    }

    isRequired () {
        return this.required;
    }

    isUnique () {
        return this.unique;
    }

    isSearchable () {
        return !this.isCalc();
    }

    isSortable () {
        return this.sortable;
    }

    hasData (key) {
        return Object.prototype.hasOwnProperty.call(this.data, key) && this.data[key] !== undefined;
    }

    canLoad () {
        return !this.isReadOnly();
    }

    canSave () {
        return !this.isCalc() && !this.isBackRef();
    }

    getId() {
        return this.id;
    }

    getMeta () {
        return this.class.meta;
    }

    getName () {
        return this.name;
    }

    getTitle () {
        return this.title;
    }

    getType () {
        return this.type;
    }

    getCastType () {
        return this.isRef() ? this.relation.getRefAttrType() : this.type;
    }

    getViewType () {
        return this.viewType;
    }

    getFormId (prefix) {
        return `${prefix}-data-${this.name}`;
    }

    getFormName () {
        return `data[${this.name}]`;
    }

    getListView () {
        return this.listView;
    }

    getSelectListView () {
        return this.selectListView;
    }

    getEagerView () {
        return this.eagerView;
    }

    getRefClass () {
        return this.relation.refClass;
    }

    getOption (key, defaults) {
        return NestedHelper.get(key, this.options, defaults);
    }

    getFormat () {
        return this.options.format;
    }

    getFormatParams () {
        return this.options.formatParams;
    }

    getDefaultFormat () {
        switch (this.viewType) {
            case 'boolean': return 'boolean';
            case 'date': return 'date';
            case 'datetime': return 'datetime';
            case 'localDate': return 'date';
            case 'localDatetime': return 'datetime';
        }
    }

    toString () {
        return this.id;
    }

    createCalc () {
        this.calc = this.hasData('expression')
            ? this.spawnCalc(this.data.expression)
            : this.classAttr.calc;
    }

    createDefaultValue () {
        this.defaultValue = this.hasData('defaultValue')
            ? this.spawnCalc(this.data.defaultValue)
            : this.classAttr.defaultValue;
    }

    spawnCalc (data) {
        if (!data || !data.Class) {
            return new Calc({attr: this, data});
        }
        try {
            const module = this.getMeta().module;
            const config = ClassHelper.resolveSpawn(data, module);
            return ClassHelper.spawn(config, {attr: this, module});
        } catch (err) {
            this.log('error', 'Invalid calc configuration', err);
            return new Calc({attr: this});
        }
    }

    createAttrs () {
        this.attrs = [];
        for (const data of this.data.children) {
            const attr = this.view.createAttr(data);
            if (attr) {
                this.attrs.push(attr);
            }
        }
    }

    createRelation () {
        this.relation = this.classAttr.relation;
        this.setRelationViews();
    }

    setRelationViews () {
        if (this.relation && this.relation.refClass) {
            this.listView = this.getRefView('listView', 'list');
            this.selectListView = this.relation.refClass.getView(this.data.selectListView) || this.listView;
            this.eagerView = this.getRefView('eagerView');
        }
    }

    getRefView (key, defaults) {
        return this.relation.refClass.getView(this.data[key] || defaults) || this.relation.refClass;
    }

    assignDataFromClassAttr () {        
        for (const key of Object.keys(this.classAttr.data)) {
            const classValue = this.classAttr.data[key];
            const skip = this.hasData(key) || this.SKIP_INHERITANCE.includes(key);
            let value = skip ? this.data[key] : classValue;
            switch (key) {
                case 'required':
                case 'unique':
                    value = classValue || value;
                    break;
                case 'options':
                    value = AssignHelper.deepAssign({}, classValue, value);
                    break;
            }
            this.data[key] = value;
        }
    }

    prepare () {
        // define data dependent on attributes of other classes
        this.enum = Enum.create(this);
        this.createActionBinder();
        this.setParent();
        this.prepareBehaviors();
        this.prepareRules();
        this.prepareCommands();
    }

    createActionBinder () {
        this.actionBinder = new ActionBinder({
            owner: this,
            data: this.data.actionBinder
        });
    }

    setParent () {
        const parent = this.class.getParent();
        if (parent) {
            const view = parent.getView(this.view.name);
            const attr = view ? view.getAttr(this.name) : null;
            this.parent = attr || parent.getAttr(this.name);
        }
    }

    prepareBehaviors () {
        if (Array.isArray(this.data.behaviors)) {
            for (const data of this.data.behaviors) {
                this.view.addAttrBehavior(this, data);
            }
        }
    }

    prepareCommands () {
        this.commandMap = {};
        if (Array.isArray(this.data.commands)) {
            for (const name of this.data.commands) {
                this.commandMap[name] = true;
            }
        }
    }

    prepareRules () {
        Validator.prepareRules(this.data.rules, this.getMeta());
    }

    resolveSearchDepth () {
        return MetaHelper.resolveInteger(this.data.searchDepth, this.DEFAULT_SEARCH_DEPTH, this.MAX_SEARCH_DEPTH);
    }

    // SEARCH

    getSearchCondition (value) {
        const condition = TypeHelper.getSearchCondition(value, this.type, this.name, this.class.getDb());
        if (condition === undefined) {
            this.log('error', 'Invalid search condition');
        }
        return condition;
    }

    resolveEagerDepth () {
        return MetaHelper.resolveInteger(this.data.eagerDepth, this.DEFAULT_EAGER_DEPTH, this.MAX_EAGER_DEPTH);
    }

    // LOG

    log () {
        CommonHelper.log(this.getMeta(), `${this.constructor.name}: ${this.id}`, ...arguments);
    }
};
module.exports.init();

const AssignHelper = require('areto/helper/AssignHelper');
const ClassHelper = require('areto/helper/ClassHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const NestedHelper = require('areto/helper/NestedHelper');
const MetaHelper = require('../helper/MetaHelper');
const ActionBinder = require('./ActionBinder');
const Enum = require('./Enum');
const Calc = require('../calc/Calc');
const TypeHelper = require('../helper/TypeHelper');
const Validator = require('../validator/Validator');