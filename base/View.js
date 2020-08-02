/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class View extends Base {

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        this.name = this.data.name;
        this.basename = this.name.split('-').pop();
        this.id = `${this.name}.${this.class.id}`;
        this.viewName = this.name;
        this.templateDir = `_view/${this.class.name}/${this.name}/`;
        this.parentTemplateDir = MetaHelper.addClosingChar(this.data.templateRoot, '/');
        this.viewModel = `_view/${this.class.name}/${this.name}`;
        this.options = {...this.class.options, ...this.data.options};
        this.translationKey = `${this.class.translationKey}.view.${this.name}`;
        this.meta = this.class.meta;
        this.title = this.data.label || this.class.title;
        this.label = MetaHelper.createLabel(this);
    }

    isClass () {
        return this === this.class;
    }

    isReadOnly () {
        return this.data.readOnly;
    }

    getId () {
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

    getOption (key, defaults) {
        return NestedHelper.get(key, this.options, defaults);
    }

    toString () {
        return this.id;
    }

    getKey () {
        return this.class.key.name;
    }

    hasKeyAttr () {
        return this.hasAttr(this.class.key.name);
    }

    hasAttr (name) {
        return this.attrMap[name] instanceof ViewAttr;
    }

    getAttr (name) {
        return this.hasAttr(name) ? this.attrMap[name] : null;
    }

    getAttrs () {
        return this.attrs;
    }

    resolveAttr (name) {
        return typeof name === 'string' ? this.getAttr(name) || this.class.getAttr(name) : name;
    }

    prepare () {
        this.createAttrs();
        this.createGroups();
        this.prepareRules();
        this.prepareOrder();
        this.creationView = this.class.getView(this.data.creationView) || this.class;
        this.editView = this.class.getView(this.data.editView) || this.class;
        this.forbiddenView = this.class.forbiddenView;
    }

    createHeader () {
        const data = this.data.header;
        this.header = data ? new ClassHeader({owner: this, data}) : this.class.header;
        this.createAttrHeader();
    }

    createAttrs () {
        const attrs = Array.isArray(this.data.attrs) ? this.data.attrs : [];
        MetaHelper.sortByOrderNumber(attrs);
        this.attrMap = {};
        this.attrs = [];
        this.attrBehaviors = [];
        this.fileAttrs = [];
        this.calcAttrs = [];
        this.defaultValueAttrs = [];
        this.searchAttrs = [];
        this.commonSearchAttrs = []; // search attributes for common grid search
        this.selectSearchAttrs = []; // search attributes for select2
        this.historyAttrs = [];
        this.refAttrs = [];
        this.backRefAttrs = [];
        this.eagerAttrs = [];
        this.eagerEmbeddedModels = {};
        for (const data of attrs) {
            this.appendAttr(this.createAttr(data));
        }
        this.eagerEmbeddedModels = Object.values(this.eagerEmbeddedModels);
    }

    createAttr (data) {
        return this.createAttrInternal(data, {
            Class: ViewAttr,
            view: this,
            class: this.class
        });
    }

    createAttrInternal (data, config) {
        if (!data) {
            return this.log('error', 'Invalid attribute data');
        }
        if (this.hasAttr(data.name)) {
            return this.log('error', `Attribute already exists: ${data.name}`);
        }
        config.data = data;
        return this.attrMap[data.name] = this.spawn(config);
    }

    appendAttr (attr) {
        if (!attr) {
            return false;
        }
        const classAttr = attr.classAttr;
        this.attrs.push(attr);
        if (classAttr.isRelation() && attr.isEagerLoading()) {
            this.eagerAttrs.push(attr);
        }
        if (attr.embeddedModel && attr.isEagerLoading()) {
            ObjectHelper.push(attr, attr.type, this.eagerEmbeddedModels);
        }
        if (attr.isFile()) {
            this.fileAttrs.push(attr);
        }
        if (attr.isCalc()) {
            this.calcAttrs.push(attr);
        }
        if (attr.isRef()) {
            this.refAttrs.push(attr);
        }
        if (attr.isBackRef()) {
            this.backRefAttrs.push(attr);
        }
        if (attr.hasData('defaultValue') || classAttr.hasData('defaultValue')) {
            this.defaultValueAttrs.push(attr);
        }
        if (attr.isSearchable()) {
            this.searchAttrs.push(attr);
        }
        if (attr.data.commonSearchable) {
            this.commonSearchAttrs.push(attr);
        }
        if (attr.data.selectSearchable) {
            this.selectSearchAttrs.push(attr);
        }
        if (attr.data.history) {
            this.historyAttrs.push(attr);
        }
    }

    createAttrHeader () {
        this.headerAttrs = [];
        for (const attr of this.attrs) {
            const config = {
                data: attr.data.header,
                owner: attr
            };
            if (config.data) {
                attr.header = new AttrHeader(config);
            } else if (attr.classAttr && attr.classAttr.header) {
                attr.header = attr.classAttr.header;
            } else if (attr.relation) {
                config.data = '.$self';
                attr.header = new AttrHeader(config);
            } else if (attr.enum) {
                config.data = ['$enum', '.$self'];
                attr.header = new AttrHeader(config);
            }
            if (attr.header) {
                this.headerAttrs.push(attr);
            }
        }
    }

    createCalc () {
        for (const attr of this.calcAttrs) {
            attr.createCalc();
        }
    }

    createDefaultValues () {
        for (const attr of this.defaultValueAttrs) {
            attr.createDefaultValue();
        }
    }

    prepareAttrs () {
        this.attrs.forEach(attr => attr.prepare());
    }

    prepareRules () {
        Validator.prepareRules(this.data.rules, this.meta);
    }

    createRelations () {
        this.relationAttrs = [];
        for (const attr of this.attrs) {
            if (attr.classAttr.relation) {
                attr.createRelation();
                this.relationAttrs.push(attr);
            }
        }
    }

    prepareEnums () {
        this.enumSets = [];
        for (const attr of this.attrs) {
            if (attr.enum) {
                this.enumSets.push(...attr.enum.queryableSets);
            }
        }
    }

    async resolveEnums () {
        for (const enumSet of this.enumSets) {
            await enumSet.resolve();
        }
    }

    prepareOrder () {
        if (!this.data.order) {
            this.order = this.class.order;
            return;
        }
        this.order = {};
        for (const key of Object.keys(this.data.order)) {
            const name = key === '$key' ? this.getKey() : key;
            this.order[name] = this.data.order[key];
        }
    }

    // FILTER

    prepareFilter () {
        try {
            this._filter = ObjectFilter.prepareConfiguration(this.data.filter, this);
        } catch (err) {
            this.log('error', 'Invalid filter configuration', err);
        }
    }

    resolveFilter (query) {
        if (this._filter) {
            return (new this._filter.Class(this._filter)).apply(query);
        }
    }

    // GROUPS

    createGroups () {
        this.grouping = new Grouping({view: this});
        this.grouping.createGroups();
    }

    // BEHAVIOR

    addAttrBehavior (attr, data) {
        data.attrName = attr.name;
        this.attrBehaviors.push(data);
    }

    getBehaviorsByClassAndAttr (Class, attr) {
        return this.getBehaviorsByClass(Class).filter(data => data.attrName === attr);
    }

    getBehaviorByClass (Class) {
        return this.getBehaviorsByClass(Class)[0];
    }

    getBehaviorsByClass (Class) {
        return ArrayHelper.filterByClassProperty(this.behaviors, Class);
    }

    prepareBehaviors () {
        Behavior.createConfigurations(this);
        Behavior.appendClassBehaviors(this);
        Behavior.setAfterFindBehaviors(this);
        Behavior.setAfterPopulateBehaviors(this);
        Behavior.sort(this);
    }

    // TREE VIEW

    createTreeView (config) {
        this.treeView = new TreeView({
            owner: this,
            class: this.class,
            data: InheritanceHelper.getNotEmptyArray(this.data.treeView, this.class.data.treeView),
            disabled: this.data.disableTreeView,
            ...config
        });
    }

    // MODEL

    findByCreator (creator, config) {
        return this.find(config).and({[this.CREATOR_ATTR]: creator});
    }

    findByEditor (editor, config) {
        return this.find(config).and({[this.EDITOR_ATTR]: editor});
    }

    findById (id, config) {
        return this.find(config).and(this.class.getIdCondition(id));
    }

    findByState (state, config) {
        return this.find(config).and({[this.STATE_ATTR]: state});
    }

    find (config) {
        return new ModelQuery({view: this, ...config});
    }

    getModelClass (data) {
        return this.meta.getClass(data[this.class.CLASS_ATTR]) || this.class;
    }

    getModelView (metaClass) {
        return this.isClass() ? metaClass : (metaClass.getView(this.name) || metaClass);
    }

    createModelByState (data, params) {
        const metaClass = this.getModelClass(data);
        const state = metaClass.getState(data[this.class.STATE_ATTR]);
        const view = (state && state.view) || this.getModelView(metaClass);
        return view.createModel(params);
    }

    createModelByData (data, params) {
        const metaClass = this.getModelClass(data);
        return this.getModelView(metaClass).createModel(params);
    }

    createModel (params) {
        const config = this.class.modelConfig;
        params = {
            view: this,
            module: this.meta.module,
            ...params
        };
        return config
            ? new config.Class({...config, ...params})
            : new Model(params);
    }

    // LOG

    log () {
        CommonHelper.log(this.meta, `${this.constructor.name}: ${this.id}`, ...arguments);
    }
};
module.exports.init();

const ArrayHelper = require('areto/helper/ArrayHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const NestedHelper = require('areto/helper/NestedHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const InheritanceHelper = require('../helper/InheritanceHelper');
const MetaHelper = require('../helper/MetaHelper');
const AttrHeader = require('../header/AttrHeader');
const ViewAttr = require('../attr/ViewAttr');
const ObjectFilter = require('../filter/ObjectFilter');
const Model = require('../model/Model');
const ModelQuery = require('../model/ModelQuery');
const Grouping = require('./Grouping');
const Behavior = require('../behavior/Behavior');
const ClassHeader = require('../header/ClassHeader');
const Validator = require('../validator/Validator');
const TreeView = require('./TreeView');