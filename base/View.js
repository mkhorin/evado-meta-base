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
        this.templateDir = `_view/${this.class.name}/${this.name}/`;
        this.parentTemplateDir = MetaHelper.addClosingChar(this.data.templateRoot, '/');
        this.viewModel = `_view/${this.class.name}/${this.name}`;
        this.options = {...this.class.options, ...this.data.options};
        this.translationKey = `${this.class.translationKey}.view.${this.name}`;
        this.meta = this.class.meta;
        this.title = this.data.label || this.class.title;
    }

    isClass () {
        return this === this.class;
    }

    getId () {
        return this.id;
    }

    getMeta () {
        return this.class.meta;
    }

    getViewId () {
        return this.id;
    }

    getName () {
        return this.name;
    }

    getTitle () {
        return this.title;
    }

    getOption (key, defaults) {
        return NestedValueHelper.get(key, this.options, defaults);
    }

    getOrder () {
        return this.data.order || this.class.data.order;
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
        this.prepareGroups();
        this.prepareRules();
    }

    createHeader () {
        const data = this.data.header;
        this.header = data ? new ClassHeader({owner: this, data}) : this.class.header;
        this.createAttrHeader();
    }

    createAttrs () {
        this.data.attrs = Array.isArray(this.data.attrs) ? this.data.attrs : [];
        MetaHelper.sortByOrderNumber(this.data.attrs);
        this.attrMap = {};
        this.attrs = [];
        this.eagerAttrs = [];
        this.fileAttrs = [];
        this.userAttrs = [];
        this.calcAttrs = [];
        this.defaultValueAttrs = [];
        this.searchAttrs = [];
        this.commonSearchAttrs = []; // search attributes for common grid search
        this.selectSearchAttrs = []; // search attributes for select2 requests
        this.historyAttrs = [];
        this.refAttrs = [];
        this.backRefAttrs = [];
        for (const data of this.data.attrs) {
            this.appendAttr(this.createAttr(data));
        }
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
        if (attr.data.eagerLoading && classAttr.isRelation()) {
            this.eagerAttrs.push(attr);
        }
        if (attr.isFile()) {
            this.fileAttrs.push(attr);
        }
        if (attr.isUser()) {
            this.userAttrs.push(attr);
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

    // FILTER

    prepareFilter () {
        try {
            this._filter = ObjectFilter.prepareConfiguration(this.data.filter, this);
        } catch (err) {
            this.log('error', 'Invalid filter configuration:', err);
        }
    }

    resolveFilter (query) {
        if (this._filter) {
            return (new this._filter.Class(this._filter)).resolve(query);
        }
    }

    // GROUPS

    hasGroup (name) {
        return Object.prototype.hasOwnProperty.call(this.groups, name);
    }

    createGroups () {
        this.rootGroup = new RootGroup({view: this});
        this.groups = {};
        if (this.data.disableGroups || (!Array.isArray() && !Array.isArray(this.class.data.groups))) {
            return false;
        }
        const viewGroupMap = IndexHelper.indexObjects(this.data.groups, 'name');
        const groups = [];
        for (const data of this.class.data.groups) {
            groups.push(AssignHelper.deepAssign({}, data, viewGroupMap[data.name]));
        }
        groups.sort((a, b) => a.orderNumber - b.orderNumber);
        for (const data of groups) {
            this.groups[data.name] = new Group({view: this, data});
        }
    }

    prepareGroups () {
        this.deleteUnusedGroups();
        this.rootGroup.prepare();
        Object.values(this.groups).forEach(group => group.prepare());
    }

    deleteUnusedGroups () {
        let usedGroups = {};
        for (const attr of this.attrs) {
            if (attr.data.group) {
                usedGroups[attr.data.group] = true;
            }
        }
        usedGroups = InheritanceHelper.addParents(usedGroups, this.groups);
        for (const name of Object.keys(this.groups)) {
            if (!Object.prototype.hasOwnProperty.call(usedGroups, name)) {
                delete this.groups[name];
            }
        }
    }

    // BEHAVIOR

    addAttrBehavior (attr, data) {
        data.attrName = attr.name;
        ObjectHelper.push(data, 'behaviors', this.data);
        return data;
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

    find (config) {
        return new ModelQuery({view: this, ...config});
    }

    findById (id, config) {
        return this.find(config).and(this.class.getIdCondition(id));
    }

    createModelByState (data, params) {
        const metaClass = this.getModelClass(data);
        const state = metaClass.getState(data[this.class.STATE_ATTR]);
        const view = (state && state.view) || this.getModelView(metaClass);
        return view.spawnModel(params);
    }

    createModel (data, params) {
        const metaClass = this.getModelClass(data);
        return this.getModelView(metaClass).spawnModel(params);
    }

    spawnModel (params) {
        const module = this.getMeta().module;
        if (!this.class.modelConfig) {
            return new Model({view: this, module, ...params});
        }
        const config = this.class.modelConfig;
        return new config.Class({...config, view: this, module, ...params});
    }

    getModelClass (data) {
        return this.meta.getClass(data[this.class.CLASS_ATTR]) || this.class;
    }

    getModelView (metaClass) {
        return this.isClass() ? metaClass : (metaClass.getView(this.name) || metaClass);
    }

    // LOG

    log () {
        CommonHelper.log(this.meta, `${this.constructor.name}: ${this.id}`, ...arguments);
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const AssignHelper = require('areto/helper/AssignHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const IndexHelper = require('areto/helper/IndexHelper');
const NestedValueHelper = require('areto/helper/NestedValueHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const InheritanceHelper = require('../helper/InheritanceHelper');
const MetaHelper = require('../helper/MetaHelper');
const AttrHeader = require('../header/AttrHeader');
const ViewAttr = require('../attr/ViewAttr');
const ObjectFilter = require('./ObjectFilter');
const Model = require('../model/Model');
const ModelQuery = require('../model/ModelQuery');
const Group = require('../group/Group');
const RootGroup = require('../group/RootGroup');
const Behavior = require('../behavior/Behavior');
const ClassHeader = require('../header/ClassHeader');
const Validator = require('../validator/Validator');
const TreeView = require('./TreeView');