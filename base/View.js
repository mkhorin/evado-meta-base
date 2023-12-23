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
        this.options = {...this.class.options, ...this.data.options};
        this.translationKey = `${this.class.translationKey}.view.${this.name}`;
        this.meta = this.class.meta;
        this.title = this.data.label || this.class.title;
        this.label = MetaHelper.createLabel(this);
        this.description = this.data.description;
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

    getAttrsByViewType (type) {
        return Array.isArray(this.viewTypeAttrMap[type])
            ? this.viewTypeAttrMap[type]
            : null;
    }

    resolveAttr (name) {
        return typeof name === 'string'
            ? this.getAttr(name) || this.class.getAttr(name)
            : name;
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
        this.header = data
            ? ClassHelper.spawn(this.meta.ClassHeader, {owner: this, data})
            : this.class.header;
        this.createAttrHeader();
    }

    createAttrs () {
        const attrs = Array.isArray(this.data.attrs) ? this.data.attrs : [];
        MetaHelper.sortByOrderNumber(attrs);
        this.attrMap = {};
        this.attrs = [];
        this.fileAttrs = [];
        this.calcAttrs = [];
        this.defaultValueAttrs = [];
        this.searchAttrs = [];
        this.commonSearchAttrs = []; // search attributes for common grid search
        this.selectSearchAttrs = []; // search attributes for select2
        this.historyAttrs = [];
        this.signedAttrs = [];
        this.refAttrs = [];
        this.backRefAttrs = [];
        this.eagerAttrs = [];
        this.eagerEmbeddedModels = {};
        this.viewTypeAttrMap = {};
        for (const data of attrs) {
            this.appendAttr(this.createAttr(data));
        }
        this.eagerEmbeddedModels = Object.values(this.eagerEmbeddedModels);
    }

    createAttr (data) {
        if (!this.class.hasAttr(data.name)) {
            return this.log('error', `Class attribute not found: ${data.name}`);
        }
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
        const attr = this.spawn(config);
        this.attrMap[data.name] = attr;
        return attr;
    }

    appendAttr (attr) {
        if (!attr) {
            return false;
        }
        const {classAttr} = attr;
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
        if (attr.data.signed) {
            this.signedAttrs.push(attr);
        }
        ObjectHelper.push(attr, attr.viewType, this.viewTypeAttrMap);
    }

    createAttrHeader () {
        this.headerAttrs = [];
        for (const attr of this.attrs) {
            const config = {
                data: attr.data.header,
                owner: attr
            };
            if (config.data) {
                attr.header = ClassHelper.spawn(this.meta.AttrHeader, config);
            } else if (attr.classAttr?.header) {
                attr.header = attr.classAttr.header;
            } else if (attr.relation) {
                config.data = '.$self';
                attr.header = ClassHelper.spawn(this.meta.AttrHeader, config);
            } else if (attr.enum) {
                config.data = ['$enum', '.$self'];
                attr.header = ClassHelper.spawn(this.meta.AttrHeader, config);
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

    createFilter () {
        try {
            this._filter = ObjectFilter.create(this.data.filter, this);
        } catch (err) {
            this.log('error', 'Invalid filter', err);
        }
    }

    applyFilter (query) {
        return this._filter?.apply(query);
    }

    // GROUPS

    createGroups () {
        this.grouping = new Grouping({view: this});
        this.grouping.createGroups();
    }

    // BEHAVIOR

    createBehaviors () {
        this.behaviors = new ViewBehaviors({owner: this});
        this.behaviors.init();
    }

    // TREE VIEW

    createTreeView (config) {
        const data = InheritanceHelper.getNotEmptyArray(
            this.data.treeView,
            this.class.data.treeView
        );
        this.treeView = new TreeView({
            owner: this,
            class: this.class,
            disabled: this.data.disableTreeView,
            data,
            ...config
        });
    }

    // MODEL

    createQuery (config) {
        return new ModelQuery({view: this, ...config});
    }

    find () {
        return this.createQuery().and(...arguments);
    }

    findByCreator (id) {
        return this.createQuery().byCreator(id);
    }

    findByEditor (id) {
        return this.createQuery().byEditor(id);
    }

    findById (id) {
        return this.createQuery().byId(id);
    }

    findByState (id) {
        return this.createQuery().byState(id);
    }

    getModelClass (data) {
        return this.meta.getClass(data[this.class.CLASS_ATTR]) || this.class;
    }

    getModelView (cls) {
        if (this.isClass()) {
            return cls;
        }
        return cls.getView(this.name) || cls;
    }

    createModelByState (data, params) {
        const cls = this.getModelClass(data);
        const state = cls.getState(data[this.class.STATE_ATTR]);
        const view = state?.view || this.getModelView(cls);
        return view.createModel(params);
    }

    createModelByData (data, params) {
        const cls = this.getModelClass(data);
        return this.getModelView(cls).createModel(params);
    }

    createModel (params) {
        const config = this.class.modelConfig;
        params = {
            view: this,
            module: this.meta.module,
            ...params
        };
        if (config) {
            return new config.Class({...config, ...params});
        }
        if (this.meta.DataModel) {
            return new this.meta.DataModel.Class({
                ...this.meta.DataModel,
                ...params
            });
        }
        return new Model(params);
    }

    // LOG

    log () {
        CommonHelper.log(this.meta, `${this.constructor.name}: ${this.id}`, ...arguments);
    }
};
module.exports.init();

const ClassHelper = require('areto/helper/ClassHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const NestedHelper = require('areto/helper/NestedHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const InheritanceHelper = require('../helper/InheritanceHelper');
const MetaHelper = require('../helper/MetaHelper');
const ViewAttr = require('../attr/ViewAttr');
const ObjectFilter = require('../filter/ObjectFilter');
const Model = require('../model/Model');
const ModelQuery = require('../model/ModelQuery');
const Grouping = require('./Grouping');
const Validator = require('../validator/Validator');
const ViewBehaviors = require('./ViewBehaviors');
const TreeView = require('./TreeView');