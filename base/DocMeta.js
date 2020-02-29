/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/meta/BaseMetaModel');

module.exports = class DocMeta extends Base {

    constructor (config) {
        super({
            name: 'document',
            source: {Class: require('../source/FileSource')},
            autoIncrementTable: 'ds_autoIncrement',
            dataTablePrefix: 'd_',
            ...config
        });
        this.createSource(this.source);
    }

    getClass (id) { // class
        return this.classMap[id] instanceof Class ? this.classMap[id] : null;
    }

    getView (id) { // view.class
        return typeof id === 'string' ? this.getViewByClass(...id.split('.')) : null;
    }

    getAttr (id) { // attr.view.class || attr.class
        if (typeof id === 'string') {
            const names = id.split('.');
            return names.length === 3 ? this.getAttrByView(...names) : this.getAttrByClass(...names);
        }
    }

    getViewByClass (viewName, className) {
        const metaClass = this.getClass(className);
        return metaClass ? metaClass.getView(viewName) : null;
    }

    getAttrByClass (attrName, className) {
        const metaClass = this.getClass(className);
        return metaClass ? metaClass.getAttr(attrName) : null;
    }

    getAttrByView (attrName, viewName, className) {
        const view = this.getViewByClass(viewName, className);
        return view ? view.getAttr(attrName) : null;
    }

    getDataTables () {
        const result = [];
        for (const metaClass of this.classes) {
            if (!metaClass.getParent()) {
                result.push(metaClass.getTable());
            }
        }
        return result;
    }

    // LOAD

    async load () {
        await super.load();
        this.createClasses();
        this.prepareClasses();
        this.createViews();
        this.createDeferredBinding();
        this.prepareBehaviors();
        await this.createIndexes();
        /*if (this.Inspector) {
            await this.Inspector.execute(this);
        }*/
    }

    createClasses () {
        this.classes = [];
        this.classMap = {};
        this.data.class.forEach(this.createClass, this);
    }

    createClass (data) {
        if (this.getClass(data.name)) {
            return this.log('error', `Class already exists: ${data.name}`);
        }
        this.classMap[data.name] = new Class({meta: this, data});
        this.classes.push(this.classMap[data.name]);
    }

    prepareClasses () { // assign inherited properties
        this.classes = ArrayHelper.sortHierarchy(this.classes, 'name', 'parent');
        this.classes.forEach(item => item.prepare());
    }

    createViews () {
        for (const data of this.data.view) {
            const metaClass = this.getClass(data.class);
            metaClass ? metaClass.createView(data)
                : this.log('error', `View: ${data.name}: Unknown class: ${data.class}`);
        }
    }

    createDeferredBinding () {
        this.processClassMethods([
            'prepareViews',
            'prepareAttrs',
            'createRelations',
            'prepareEnums',
            'prepareKey',
            'prepareFilter',
            'createHeader',
            'createCalc',
            'createDefaultValues',
            'createStates',
            'createTransitions',
            'createTreeView'
        ]);
    }

    processClassMethods (methods) {
        for (const method of methods) {
            for (const metaClass of this.classes) {
                metaClass[method]();
            }
        }
    }

    prepareBehaviors () {
        for (const metaClass of this.classes) {
            metaClass.prepareBehaviors();
        }
    }

    async createIndexes () {
        for (const metaClass of this.classes) {
            await metaClass.indexing.create();
        }
    }

    async dropData () {
        for (const metaClass of this.classes) {
            await metaClass.dropData();
        }
        await this.dropTablesByPrefix(this.dataTablePrefix);
        await this.getDb().drop(this.autoIncrementTable);
    }

    async afterDataImport () {
        for (const metaClass of this.classes) {
            await metaClass.indexing.create();
            await AutoIncrementBehavior.normalize(metaClass);
        }
    }

    resolveClassesByNames (names) {
        return Object.values(ObjectHelper.filterByKeys(names, this.classMap));
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const AutoIncrementBehavior = require('../behavior/AutoIncrementBehavior');
const Class = require('./Class');