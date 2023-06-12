/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Group');

module.exports = class Grouping extends Base {

    static getConstants () {
        return {
            INHERITED_OPTIONS: [
                'cssLabel',
                'cssValue'
            ]
        };
    }

    init () {
        this.data = {};
        this.name = '_root';
        this.id = `${this.name}.${this.view.id}`;
        this.options = {};
    }

    getGroup (name) {
        return this.groupMap[name] instanceof Group
            ? this.groupMap[name]
            : null;
    }

    createGroups () {
        this.view.isClass()
            ? this.createClassGroups()
            : this.createViewGroups();
        this.deleteUnusedGroups();
        for (const group of Object.values(this.groupMap)) {
            group.prepare();
        }
        this.prepare();
        this.inheritOptions();
    }

    createClassGroups () {
        this.groupMap = {};
        const view = this.view;
        view.data.groups = view.getInheritedData('groups');
        if (Array.isArray(view.data.groups)) {
            MetaHelper.sortByOrderNumber(view.data.groups);
            for (const data of view.data.groups) {
                this.groupMap[data.name] = new Group({view, data});
            }
        }
    }

    createViewGroups () {
        this.groupMap = {};
        const view = this.view;
        const viewData = view.data;
        const classGroupData = view.class.data.groups;
        if (viewData.disableGroups || !Array.isArray(classGroupData)) {
            return false;
        }
        const viewGroupMap = IndexHelper.indexObjects(viewData.groups, 'name');
        const groups = [];
        for (const data of classGroupData) {
            groups.push(AssignHelper.deepAssign({}, data, viewGroupMap[data.name]));
        }
        MetaHelper.sortByOrderNumber(groups);
        for (const data of groups) {
            this.groupMap[data.name] = new Group({view, data});
        }
    }

    deleteUnusedGroups () {
        let usedGroupMap = {};
        for (const attr of this.view.attrs) {
            if (attr.data.group) {
                usedGroupMap[attr.data.group] = true;
            }
        }
        InheritanceHelper.assignParents(usedGroupMap, this.groupMap);
        for (const name of Object.keys(this.groupMap)) {
            if (!Object.hasOwn(usedGroupMap, name)) {
                delete this.groupMap[name];
            }
        }
    }

    inheritOptions () {
        for (const group of Object.values(this.groupMap)) {
            MetaHelper.inheritOptions(this.INHERITED_OPTIONS, group);
        }
    }

    forceGetAttrs () {
        const list = [];
        for (const attr of this.view.attrs) {
            if (!attr.data.group || !this.getGroup(attr.data.group)) {
                list.push(attr);
            }
        }
        return list;
    }

    forceGetGroups () {
        const list = [];
        for (const group of Object.values(this.groupMap)) {
            if (!this.getGroup(group.data.parent)) {
                list.push(group);
            }
        }
        return list;
    }

    createActionBinder () {
        this.actionBinder = new ActionBinder;
    }
};
module.exports.init();

const ActionBinder = require('../attr/ActionBinder');
const AssignHelper = require('areto/helper/AssignHelper');
const IndexHelper = require('areto/helper/IndexHelper');
const InheritanceHelper = require('../helper/InheritanceHelper');
const MetaHelper = require('../helper/MetaHelper');
const Group = require('./Group');