/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('evado/component/meta/MetaModel');

module.exports = class BaseMeta extends Base {

    constructor (config) {
        super({
            dataTablePrefix: 'd_',
            name: 'base',
            source: {
                Class: require('../source/FileSource')
            },
            AutoIncrementModel: {
                Class: require('evado/model/AutoIncrement')
            },
            AttrHeader: {
                Class: require('../header/AttrHeader')
            },
            ClassHeader: {
                Class: require('../header/ClassHeader')
            },
            DataHistoryModel: {
                Class: require('evado/model/DataHistory')
            },
            UserModel: {
                Class: require('evado/model/User')
            },
            ...config
        });
        this.createSource(this.source);
    }

    getClass (name) {
        return this.classMap[name] instanceof Class ? this.classMap[name] : null;
    }

    /**
     * @param id - view.class || class
     */
    getView (id) {
        if (typeof id !== 'string') {
            return null;
        }
        const index = id.indexOf('.');
        return index !== -1
            ? this.getViewByClass(id.substring(0, index), id.substring(index + 1))
            : this.getClass(id);
    }

    /**
     * @param id - attr.view.class or attr.class
     */
    getAttr (id) {
        if (typeof id === 'string') {
            const names = id.split('.');
            return names.length === 3
                ? this.getAttrByView(...names)
                : this.getAttrByClass(...names);
        }
    }

    getViewByClass (viewName, className) {
        return this.getClass(className)?.getView(viewName);
    }

    getAttrByClass (attrName, className) {
        return this.getClass(className)?.getAttr(attrName);
    }

    getAttrByView (attrName, viewName, className) {
        return this.getViewByClass(viewName, className)?.getAttr(attrName);
    }

    getDataTables () {
        const result = [];
        for (const cls of this.classes) {
            if (!cls.getParent()) {
                result.push(cls.getTable());
            }
        }
        return result;
    }

    getClassTitles (names) {
        if (Array.isArray(names)) {
            const result = [];
            for (const name of names) {
                result.push(this.getClass(name)?.title || name);
            }
            return result;
        }
    }

    // LOAD

    async load () {
        await super.load();
        this.createClasses();
        this.prepareClasses();
        this.createViews();
        await this.createDeferredBinding();
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
        const {name} = data;
        if (this.getClass(name)) {
            return this.log('error', `Class already exists: ${name}`);
        }
        this.classMap[name] = new Class({meta: this, data});
        this.classes.push(this.classMap[name]);
    }

    prepareClasses () {
        // assign inherited properties
        this.classes = ArrayHelper.sortHierarchy(this.classes, 'name', 'parent');
        this.classes.forEach(item => item.prepare());
    }

    createViews () {
        for (const data of this.data.view) {
            const cls = this.getClass(data.class);
            cls ? cls.createView(data)
                : this.log('error', `View: ${data.name}: Unknown class: ${data.class}`);
        }
    }

    async createDeferredBinding () {
        await this.processClassMethods([
            'prepareViews',
            'prepareAttrs',
            'createRelations',
            'prepareEnums',
            'prepareKey',
            'createFilter',
            'createHeader',
            'createStates',
            'createDefaultValues',
            'createCalc',
            'createTransitions',
            'createTreeView',
            'createBehaviors',
            'createVersion',
            'prepareVersion'
        ]);
    }

    async processClassMethods (methods) {
        for (const method of methods) {
            for (const cls of this.classes) {
                await cls[method]();
            }
        }
    }

    async createIndexes () {
        for (const cls of this.classes) {
            await cls.createIndexes();
        }
    }

    async dropData () {
        for (const cls of this.classes) {
            await cls.dropData();
        }
        await this.dropTablesByPrefix(this.dataTablePrefix);
    }

    async afterDataImport () {
        for (const cls of this.classes) {
            await cls.createIndexes();
            await AutoIncrementBehavior.normalize(cls);
        }
    }

    resolveClassesByNames (names) {
        return Object.values(ObjectHelper.filterByKeys(names, this.classMap));
    }

    createDataFinder (items, params) {
        if (typeof items === 'string') {
            items = items.split('.');
        }
        const cls = this.getClass(items[0]);
        if (!cls) {
            return null;
        }
        return this.spawn({
            Class: DataFinder,
            field: items[1],
            view: cls,
            ...params
        });
    }
};

const ArrayHelper = require('areto/helper/ArrayHelper');
const ObjectHelper = require('areto/helper/ObjectHelper');
const AutoIncrementBehavior = require('../behavior/AutoIncrementBehavior');
const Class = require('./Class');
const DataFinder = require('./DataFinder');