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
        const {data} = this;
        this.label = MetaHelper.createLabel(this);
        this.title = this.label;
        this.description = data.description;
        this.hint = data.hint;
        this.extHint = data.extHint;
        this.options = data.options || {};
        if (this.options.format === undefined) {
            this.options.format = this.getDefaultFormat();
        }
        if (MetaHelper.isSystemName(this.name) || this.isCalc()) {
            data.readOnly = true;
        }
        this.searchDepth = this.resolveSearchDepth();
        this.eagerDepth = this.resolveEagerDepth();
        this.escaping = data.escape && this.isTypeEscaping();
        this.readOnly = data.readOnly === true || this.view.isReadOnly();
        this.required = data.required === true;
        this.unique = data.unique === true;
        this.sortable = data.sortable === true;
        this.template = this.options.template || this.viewType;
    }

    isBoolean () {
        return this.type === TYPES.BOOLEAN;
    }

    isCalc () {
        return this.type === TYPES.CALC;
    }

    isClassAttr () {
        return this === this.classAttr;
    }

    isDate () {
        return this.type === TYPES.DATE;
    }

    isFile () {
        return this.type === TYPES.FILE;
    }

    isJson () {
        return this.type === TYPES.JSON;
    }

    isGroup () {
        return false;
    }

    isHidden () {
        return this.data.hidden === true;
    }

    isHideEmpty () {
        return this.data.hideEmpty === true;
    }

    isHistory () {
        return this.data.history === true;
    }

    isNumber () {
        return this.type === TYPES.INTEGER
            || this.type === TYPES.FLOAT;
    }

    isString () {
        return this.type === TYPES.STRING;
    }

    isText () {
        return this.type === TYPES.TEXT;
    }

    isRef () {
        return this.type === TYPES.REF;
    }

    isBackRef () {
        return this.type === TYPES.BACK_REF;
    }

    isRelation () {
        return this.type === TYPES.REF
            || this.type === TYPES.BACK_REF;
    }

    isClassView () {
        return this.viewType === VIEW_TYPES.CLASS;
    }

    isClassesView () {
        return this.viewType === VIEW_TYPES.CLASSES;
    }

    isStateView () {
        return this.viewType === VIEW_TYPES.STATE;
    }

    isStringView () {
        return this.viewType === TYPES.STRING;
    }

    isTimeView () {
        return this.viewType === VIEW_TYPES.TIME;
    }

    isThumbnailView () {
        return this.viewType === VIEW_TYPES.THUMBNAIL;
    }

    isUTC () {
        return this.viewType === VIEW_TYPES.DATE
            || this.viewType === VIEW_TYPES.DATETIME;
    }

    isEagerLoading () {
        return this.data.eagerLoading;
    }

    isEmbeddedModel () {
        return !!this.embeddedModel;
    }

    isUser () {
        return this.type === TYPES.USER;
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

    isTypeEscaping () {
        return this.isString()
            || this.isText()
            || this.isRelation()
            || this.isJson();
    }

    hasData (key) {
        return Object.hasOwn(this.data, key) && this.data[key] !== undefined;
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
        return this.isRef()
            ? this.relation.getRefAttrType()
            : this.type;
    }

    getViewType () {
        return this.viewType;
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

    getDefaultFormat () {
        switch (this.viewType) {
            case 'boolean': return 'boolean';
            case 'date': return 'date';
            case 'datetime': return 'datetime';
            case 'localDate': return 'date';
            case 'localDatetime': return 'datetime';
        }
        if (this.options.mask) {
            return {
                name: 'mask',
                params: this.options.mask
            };
        }
    }

    getTemplate () {
        return this.template;
    }

    getAncestors () {
        if (!this._ancestors) {
            this._ancestors = [];
            let attr = this.parent;
            while (attr) {
                this._ancestors.push(attr);
                attr = attr.parent;
            }
        }
        return this._ancestors;
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
            return new AttrCalc({attr: this, data});
        }
        try {
            const {module} = this.getMeta();
            const config = ClassHelper.resolveSpawn(data, module);
            return ClassHelper.spawn(config, {attr: this, module});
        } catch (err) {
            this.log('error', 'Invalid calc configuration', err);
            return new AttrCalc({attr: this});
        }
    }

    createRelation () {
        this.relation = this.classAttr.relation;
        this.setRelationViews();
    }

    setRelationViews () {
        if (this.relation?.refClass) {
            this.listView = this.getRefView('listView', 'list');
            const view = this.relation.refClass.getView(this.data.selectListView);
            this.selectListView = view || this.listView;
            this.eagerView = this.getRefView('eagerView', 'eager');
        }
    }

    getRefView (key, defaults) {
        return this.relation.refClass.getView(this.data[key] || defaults)
            || this.relation.refClass;
    }

    assignDataFromClassAttr () {
        for (const key of Object.keys(this.classAttr.data)) {
            const classValue = this.classAttr.data[key];
            const skip = this.hasData(key) || this.SKIP_INHERITANCE.includes(key);
            let value = skip ? this.data[key] : classValue;
            switch (key) {
                case 'required':
                case 'unique': {
                    value = classValue || value;
                    break;
                }
                case 'actionBinder': {
                    value = classValue || value
                        ? {...classValue, ...value}
                        : null;
                    break;
                }
                case 'options': {
                    value = AssignHelper.deepAssign({}, classValue, value);
                    break;
                }
            }
            this.data[key] = value;
        }
    }

    /**
     * Define data dependent on attributes of other classes
     */
    prepare () {
        this.createEnum();
        this.createActionBinder();
        this.setParent();
        this.prepareRules();
        this.prepareCommands();
        this.setTranslatable();
    }

    createEnum () {
        if (this.options.enumDisabled) {
            return false;
        }
        const data = this.data.enums;
        if (Array.isArray(data) && data.length) {
            this.enum = new Enum({attr: this, data});
        } else {
            this.enum = this.classAttr.enum;
            this.data.enums = this.classAttr.data.enums;
        }
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
            const attr = view?.getAttr(this.name);
            this.parent = attr || parent.getAttr(this.name);
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
        return MetaHelper.resolveInteger(
            this.data.searchDepth,
            this.DEFAULT_SEARCH_DEPTH,
            this.MAX_SEARCH_DEPTH
        );
    }

    setTranslatable () {
        this.translatable = this.isStateView() || !!this.enum;
    }

    getSearchCondition (value) {
        const db = this.class.getDb();
        const condition = TypeHelper.getSearchCondition(value, this.type, this.name, db);
        if (condition === undefined) {
            this.log('error', 'Invalid search condition');
        }
        return condition;
    }

    resolveEagerDepth () {
        return MetaHelper.resolveInteger(
            this.data.eagerDepth,
            this.DEFAULT_EAGER_DEPTH,
            this.MAX_EAGER_DEPTH
        );
    }

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
const AttrCalc = require('../calc/AttrCalc');
const TypeHelper = require('../helper/TypeHelper');
const Validator = require('../validator/Validator');
const {VIEW_TYPES, TYPES} = TypeHelper;