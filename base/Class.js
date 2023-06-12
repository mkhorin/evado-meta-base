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
            RELATION_SORTED_ATTR: '_sorted',
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
        this.options = this.data.options || {};
        this.title = MetaHelper.createLabel(this);
        this.label = this.title;
        this.description = this.data.description;
        this.data.views = [];
        this.createModelConfig();
    }

    isAbstract () {
        return this.data.abstract;
    }

    hasAncestor (cls) {
        return this.parent
            ? this.parent === cls || this.parent.hasAncestor(cls)
            : false;
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

    getLastVersion () {
        return this.version ? this.version.target : this;
    }

    getParent () {
        return this.meta.getClass(this.data.parent);
    }

    getDefaultState () {
        return this.defaultState;
    }

    getState (name) {
        return this.stateMap[name] instanceof State
            ? this.stateMap[name]
            : null;
    }

    getStateAttr () {
        return this.attrMap[this.STATE_ATTR];
    }

    getTransition (name) {
        return this.transitionMap?.[name] instanceof Transition
            ? this.transitionMap[name]
            : null;
    }

    getStartStateTransitions (state) {
        state = state instanceof State ? state.name : state;
        state = this.startStateTransitionMap[state];
        return Array.isArray(state) ? state : null;
    }

    getAttrByView (viewName, attrName) {
        return this.getView(viewName)?.getAttr(attrName);
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
        this.createCondition();
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
        this.table = this.parent?.table || `${this.meta.dataTablePrefix}${this.name}`;
    }

    setTranslationKey () {
        const prefix = this.parent?.translationKey || 'class';
        this.translationKey = `${prefix}.${this.name}`;
    }

    setChildren () {
        this.children = [];
        for (const item of this.meta.classes) {
            if (item.getParent() === this) {
                this.children.push(item);
            }
        }
    }

    createCondition () {
        this.condition = new ClassCondition({class: this});
        this.condition.resolveInheritance();
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
        if (!this.parent) {
            return new ClassIndexing({class: this});
        }
    }

    createIndexes () {
        return this.indexing?.create();
    }

    createHeader () {
        const data = this.data.header;
        if (data) {
            this.header = ClassHelper.spawn(this.meta.ClassHeader, {
                owner: this,
                data
            });
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

    createFilter () {
        this.views.forEach(view => view.createFilter());
    }

    createVersion () {
        this.version = ClassVersion.create(this);
    }

    prepareVersion () {
        this.version?.prepare();
    }

    // BEHAVIOR

    createBehaviors () {
        this.behaviors = new ClassBehaviors({owner: this});
        this.behaviors.init();
        this.views.forEach(view => view.createBehaviors());
    }

    // WORKFLOW

    createStates () {
        this.stateMap = {};
        if (Array.isArray(this.data.states)) {
            for (const data of this.data.states) {
                this.createState(data);
            }
        }
        this.states = Object.values(this.stateMap);
    }

    createState (data) {
        const state = new State({class: this, data});
        if (state.isDefault()) {
            this.defaultState = state;
        }
        this.stateMap[data.name] = state;
    }

    createTransitions () {
        const data = {};
        if (Array.isArray(this.data.transitions)) {
            for (const item of this.data.transitions) {
                data[item.name] = this.createTransition(item);
            }
        }
        this.transitions = MetaHelper.sortByDataOrderNumber(Object.values(data));
        this.transitionMap = this.transitions.length ? data : null;
        this.startStateTransitionMap = this.indexStateTransitions('startStates', 'nullStartState');
        for (const state of this.states) {
            state.resolveDeadEnd(this.transitions);
        }
    }

    createTransition (data) {
        return new Transition({class: this, data});
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
        return this.viewMap[name] instanceof View
            ? this.viewMap[name]
            : null;
    }

    getViewWithPrefix (prefix, name) {
        return this.getView(`${prefix}-${name}`) || this.getView(name);
    }

    createView (data) {
        const name = data.name;
        if (this.getView(name)) {
            return this.log('error', `View already exists: ${name}`);
        }
        const view = new View({class: this, data});
        this.views.push(view);
        this.viewMap[name] = view;
        this.data.views.push(data);
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
        return this.key.getCondition(id) || ['false'];
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
        return this.hasAttr(name)
            ? this.attrMap[name].canSave()
            : MetaHelper.isSystemName(name);
    }

    insert (data) {
        data = this.filterValues(data);
        data[this.CLASS_ATTR] = this.name;
        data[this.CREATED_AT_ATTR] = new Date;
        return this.createQuery().insert(data);
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
        await this.behaviors.dropData();
        for (const view of this.views) {
            await view.behaviors.dropData();
        }
        this.log('info', 'Data deleted');
    }

    // RELATION ATTRIBUTES

    getRelationAttrsOnUpdate () {
        if (!this._relationAttrsOnUpdate) {
            this._relationAttrsOnUpdate = this.resolveRelationAttrsByAction('onUpdate');
        }
        return this._relationAttrsOnUpdate;
    }

    getRelationAttrsOnDelete () {
        if (!this._relationAttrsOnDelete) {
            this._relationAttrsOnDelete = this.resolveRelationAttrsByAction('onDelete');
        }
        return this._relationAttrsOnDelete;
    }

    resolveRelationAttrsByAction (action) {
        const nulls = [], cascades = [], locks = [];
        for (const {attrs} of this.meta.classes) {
            for (const attr of attrs) {
                const rel = attr.relation;
                if (!rel) {
                    continue;
                }
                if (rel.refClass !== this) {
                    if (!this.hasAncestor(rel.refClass)) {
                        continue;
                    }
                }
                switch (rel[action]) {
                    case 'null': {
                        nulls.push(attr);
                        break;
                    }
                    case 'cascade': {
                        cascades.push(attr);
                        break;
                    }
                    case 'lock': {
                        locks.push(attr);
                        break;
                    }
                }
            }
        }
        return {nulls, cascades, locks};
    }

    // DESCENDANTS

    getActiveDescendants () {
        if (!this._activeDescendants) {
            const names = this.data.activeDescendants;
            this._activeDescendants = Array.isArray(names) && names.length
                ? this.meta.resolveClassesByNames(names)
                : this.resolveActiveDescendants();
        }
        return this._activeDescendants;
    }

    resolveActiveDescendants () {
        const classes = this.getRealDescendants();
        if (!this.isAbstract()) {
            classes.push(this);
        }
        return classes;
    }

    getRealDescendants () {
        if (!this._realDescendants) {
            const classes = this.getDescendants();
            this._realDescendants = classes.filter(cls => !cls.isAbstract());
        }
        return this._realDescendants;
    }

    getDescendants () {
        if (!this._descendants) {
            this._descendants = [];
            for (const cls of this.meta.classes) {
                if (cls.data.parent === this.name) {
                    this._descendants.push(cls, ...cls.getDescendants());
                }
            }
        }
        return this._descendants;
    }

    getInheritedData (key) {
        if (Object.hasOwn(this.data, key)) {
            return this.data[key];
        }
        if (this.getParent()) {
            return this.getParent().getInheritedData(key);
        }
    }
};
module.exports.init();

const ClassHelper = require('areto/helper/ClassHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const InheritanceHelper = require('../helper/InheritanceHelper');
const MetaHelper = require('../helper/MetaHelper');
const ClassAttr = require('../attr/ClassAttr');
const ClassBehaviors = require('./ClassBehaviors');
const ClassCondition = require('./ClassCondition');
const ClassKey = require('./ClassKey');
const ClassIndexing = require('./ClassIndexing');
const ClassVersion = require('./ClassVersion');
const View = require('./View');
const State = require('../workflow/State');
const Transition = require('../workflow/Transition');