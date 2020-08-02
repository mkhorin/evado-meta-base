/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./View');
const TypeHelper = require('../helper/TypeHelper');

module.exports = class Class extends Base {

    static getConstants () {
        return {
            TYPES: TypeHelper.TYPES,
            CLASS_ATTR: '_class',
            CREATED_AT_ATTR: '_createdAt',
            UPDATED_AT_ATTR: '_updatedAt',
            CREATOR_ATTR: '_creator',
            EDITOR_ATTR: '_editor',
            STATE_ATTR: '_state',
            TRANSITING_ATTR: '_transiting',
            RELATION_SORT_ATTR: '_sort',
            RELATION_ORDER_PREFIX: '_order_'
        };
    }

    init () {
        this.class = this;
        this.name = this.data.name;
        this.id = this.name;
        this.viewName = '';
        this.parent = this.data.parent;
        this.viewMap = {};
        this.views = [];
        this.key = this.createKey();
        this.indexing = this.createIndexing();
        this.transiting = {};
        this.templateDir = `_class/${this.class.name}/`;
        this.parentTemplateDir = MetaHelper.addClosingChar(this.data.templateRoot, '/');
        this.viewModel = `_class/${this.class.name}`;
        this.options = this.data.options || {};
        this.title = MetaHelper.createLabel(this);
        this.label = this.title;
        this.createModelConfig();
    }

    isAbstract () {
        return this.data.abstract;
    }

    hasAncestor (metaClass) {
        return this.parent ? (this.parent === metaClass || this.parent.hasAncestor(metaClass)) : false;
    }

    getMeta () {
        return this.meta;
    }

    getDb () {
        return this.meta.getDb();
    }

    getTable () {
        return this.table;
    }

    getKey () {
        return this.key.name;
    }

    getParent () {
        return this.meta.getClass(this.data.parent);
    }

    getDefaultState () {
        return this.defaultState;
    }

    getState (name) {
        return this.stateMap[name] instanceof State ? this.stateMap[name] : null;
    }

    getTransition (name) {
        return this.transitionMap && this.transitionMap[name] instanceof Transition
            ? this.transitionMap[name]
            : null;
    }

    getStartStateTransitions (state) {
        state = this.startStateTransitionMap[state instanceof State ? state.name : state];
        return Array.isArray(state) ? state : null;
    }

    getAttrByView (viewName, attrName) {
        const view = this.getView(viewName);
        return view ? view.getAttr(attrName) : null;
    }

    createModelConfig () {
        this.modelConfig = this.meta.resolveSpawn(this.data.modelConfig);
    }

    resolveAttr (name) {
        return typeof name === 'string' ? this.getAttr(name) : name;
    }

    // PREPARE

    prepare () {
        this.setParent();
        this.setTable();
        this.setTranslationKey();
        this.setChildren();
        this.setClassCondition();
        super.prepare();
    }

    prepareAttrs () {
        this.attrs.forEach(attr => attr.prepare());
        this.views.forEach(view => view.prepareAttrs());
    }

    setParent () {
        this.parent = this.getParent();
        if (this.parent) {
            InheritanceHelper.mergeClassData(this.data, this.parent.data);
        }
    }

    setTable () {
        this.table = this.parent ? this.parent.table : `${this.meta.dataTablePrefix}${this.name}`;
    }

    setTranslationKey () {
        this.translationKey = `${this.parent ? this.parent.translationKey : 'class'}.${this.name}`;
    }

    setChildren () {
        this.children = [];
        for (const item of this.meta.classes) {
            if (item.getParent() === this) {
                this.children.push(item);
            }
        }
    }

    setClassCondition () {
        if (!this.parent) {
            return null;
        }
        const names = this.getDescendants().filter(item => !item.isAbstract()).map(item => item.name);
        if (!this.isAbstract()) {
            names.push(this.name);
        }
        this.condition = names.length
            ? {[this.CLASS_ATTR]: names.length > 1 ? names : names[0]}
            : ['FALSE'];
    }

    createRelations () {
        this.relationAttrs = [];
        for (const attr of this.attrs) {
            if (attr.data.refClass) {
                attr.createRelation();
                this.relationAttrs.push(attr);
            }
        }
        for (const view of this.views) {
            view.createRelations();
        }
    }

    createKey () {
        return new ClassKey({class: this});
    }

    prepareKey () {
        this.key.prepare();
    }

    createIndexing () {
        return this.parent ? null : new ClassIndexing({class: this});
    }

    createIndexes () {
        return this.indexing ? this.indexing.create() : null;
    }

    createHeader () {
        const data = this.data.header;
        if (data) {
            this.header = new ClassHeader({owner: this, data});
        }
        this.createAttrHeader();
        this.views.forEach(view => view.createHeader());
    }

    createCalc () {
        super.createCalc();
        this.views.forEach(view => view.createCalc());
    }

    createDefaultValues () {
        super.createDefaultValues();
        this.views.forEach(view => view.createDefaultValues());
    }

    prepareEnums () {
        super.prepareEnums();
        this.views.forEach(view => view.prepareEnums());
    }
    
    prepareFilter () {        
        this.views.forEach(view => view.prepareFilter());
    }

    // BEHAVIOR

    prepareBehaviors () {
        Behavior.createConfigurations(this);
        this.prepareFileBehavior();
        this.prepareHistoryBehavior();
        Behavior.setAfterFindBehaviors(this);
        Behavior.setAfterPopulateBehaviors(this);
        Behavior.sort(this);
        this.views.forEach(view => view.prepareBehaviors());
    }

    prepareFileBehavior () {
        if (this.fileAttrs.length === 1) {
            const config = this.getBehaviorByClass(FileBehavior);
            this.FileBehaviorConfig = config || Behavior.appendConfiguration(this, {Class: FileBehavior});
            this.FileBehaviorConfig.attrName = this.fileAttrs[0].name;
        }
    }

    prepareHistoryBehavior () {
        if (this.historyAttrs.length && !this.getBehaviorByClass(HistoryBehavior)) {
            Behavior.appendConfiguration(this, {Class: HistoryBehavior});
        }
    }

    // WORKFLOW

    createStates () {
        this.stateMap = {};
        if (Array.isArray(this.data.states)) {
            for (const data of this.data.states) {
                const state = new State({class: this, data});
                if (state.isDefault()) {
                    this.defaultState = state;
                }
                this.stateMap[data.name] = state;
            }
        }
        this.states = Object.values(this.stateMap);
    }

    createTransitions () {
        const data = {};
        if (Array.isArray(this.data.transitions)) {
            for (const item of this.data.transitions) {
                data[item.name] = new Transition({
                    class: this, 
                    data: item
                });
            }    
        }        
        this.transitions = MetaHelper.sortByDataOrderNumber(Object.values(data));
        this.transitionMap = this.transitions.length ? data : null;
        this.startStateTransitionMap = this.indexStateTransitions('startStates', 'nullStartState');
        for (const state of this.states) {
            state.resolveDeadEnd(this.transitions);
        }
    }

    indexStateTransitions (key, nullStateKey) {
        const result = {};
        for (const item of this.transitions) {
            if (Array.isArray(item[key])) {
                for (const state of item[key]) {
                    ObjectHelper.push(item, state.name, result);
                }
            } else if (item[key] instanceof State) {
                ObjectHelper.push(item, item[key].name, result);
            }
            if (item[nullStateKey]) {
                ObjectHelper.push(item, null, result);
            }
        }
        return result;
    }

    // TREE VIEW

    createTreeView () {
        super.createTreeView();
        this.views.forEach(view => view.createTreeView());
    }

    // VIEW

    getView (name) {
        return this.viewMap[name] instanceof View ? this.viewMap[name] : null;
    }

    getViewByPrefix (prefix, name) {
        return this.getView(`${prefix}-${name}`) || this.getView(name);
    }

    createView (data) {
        if (this.getView(data.name)) {
            return this.log('error', `View already exists: ${data.name}`);
        }
        this.viewMap[data.name] = new View({class: this, data});
        this.views.push(this.viewMap[data.name]);
    }

    prepareViews () {
        if (this.parent) {
            this.inheritViews(this.parent.views);
        }
        this.forbiddenView = this.viewMap[this.data.forbiddenView];
        this.views.map(view => view.prepare());
    }

    inheritViews (views) {
        for (const view of views) {
            if (!this.getView(view.name)) {
                this.createView(view.data);
            }
        }
    }

    // ATTRIBUTES

    createAttr (data) {
        return this.createAttrInternal(data, {
            Class: ClassAttr,
            class: this
        });
    }

    // QUERY

    getIdCondition (id) {
        return this.key.getCondition(id) || ['FALSE'];
    }

    filterValues (data) {
        const values = {};
        if (data) {
            for (const name of Object.keys(data)) {
                if (this.filterValue(name)) {
                    values[name] = data[name];
                }
            }
        }
        return values;
    }

    filterValue (name) {
        return this.hasAttr(name) ? this.attrMap[name].canSave() : MetaHelper.isSystemName(name);
    }

    insert (data) {
        data = this.filterValues(data);
        data[this.CLASS_ATTR] = this.name;
        data[this.CREATED_AT_ATTR] = new Date;
        return this.find().insert(data);
    }

    update (id, data) {
        data = this.filterValues(data);
        data[this.UPDATED_AT_ATTR] = new Date;
        return this.findById(id).update(data);
    }

    updateAll (condition, data) {
        return this.getDb().updateAll(this.table, condition, data);
    }

    updateAllPull (condition, data) {
        return this.getDb().updateAllPull(this.table, condition, data);
    }

    updateAllPush (condition, data) {
        return this.getDb().updateAllPush(this.table, condition, data);
    }

    async dropData () {
        await this.getDb().drop(this.table);
        await Behavior.dropData(this);
        for (const view of this.views) {
            await Behavior.dropData(view);
        }
        this.log('info', 'Data deleted');
    }

    // RELATION ATTRIBUTES

    getRelationAttrsOnUpdate () {
        if (!this._relationAttrsOnUpdate) {
            this._relationAttrsOnUpdate = this.getAttrsOnAction('onUpdate', this);
        }
        return this._relationAttrsOnUpdate;
    }

    getRelationAttrsOnDelete () {
        if (!this._relationAttrsOnDelete) {
            this._relationAttrsOnDelete = this.getAttrsOnAction('onDelete', this);
        }
        return this._relationAttrsOnDelete;
    }

    getAttrsOnAction (action) {
        const nulls = [], cascades = [];
        for (const metaClass of this.meta.classes) {
            for (const attr of metaClass.attrs) {
                if (attr.relation && (attr.relation.refClass === this || this.hasAncestor(attr.relation.refClass))) {
                    switch (attr.relation[action]) {
                        case 'null': nulls.push(attr); break;
                        case 'cascade': cascades.push(attr); break;
                    }
                }
            }
        }
        return {nulls, cascades};
    }

    // DESCENDANTS

    getActiveDescendants () {
        if (!this._activeDescendants) {
            const names = this.data.activeDescendants;
            this._activeDescendants = Array.isArray(names) && names.length
                ? this.meta.resolveClassesByNames(names)
                : this.getRealDescendants();
        }
        return this._activeDescendants;
    }

    getRealDescendants () {
        if (!this._realDescendants) {
            this._realDescendants = this.getDescendants().filter(metaClass => !metaClass.isAbstract());
        }
        return this._realDescendants;
    }

    getDescendants () {
        if (!this._descendants) {
            this._descendants = [];
            for (const metaClass of this.meta.classes) {
                if (metaClass.data.parent === this.name) {
                    this._descendants.push(metaClass, ...metaClass.getDescendants());
                }
            }
        }
        return this._descendants;
    }

    getInheritedData (key) {
        return Object.prototype.hasOwnProperty.call(this.data, key)
            ? this.data[key]
            : this.getParent() ? this.getParent().getInheritedData(key) : undefined;
    }
};
module.exports.init();

const ObjectHelper = require('areto/helper/ObjectHelper');
const InheritanceHelper = require('../helper/InheritanceHelper');
const MetaHelper = require('../helper/MetaHelper');
const Behavior = require('../behavior/Behavior');
const FileBehavior = require('../behavior/FileBehavior');
const HistoryBehavior = require('../behavior/DataHistoryBehavior');
const ClassAttr = require('../attr/ClassAttr');
const ClassHeader = require('../header/ClassHeader');
const ClassKey = require('./ClassKey');
const ClassIndexing = require('./ClassIndexing');
const View = require('./View');
const State = require('../workflow/State');
const Transition = require('../workflow/Transition');