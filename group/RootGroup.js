/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Group');

module.exports = class RootGroup extends Base {

    init () {
        this.id = `_rootGroup.${this.view.id}`;
    }

    getAttrs () {
        const list = [];
        for (const attr of this.view.attrs) {
            if (!attr.data.group || !this.view.hasGroup(attr.data.group)) {
                list.push(attr);
            }
        }
        return list;
    }

    getGroups () {
        const list = [];
        for (const group of Object.values(this.view.groups)) {
            if (!this.view.hasGroup(group.data.parent)) {
                list.push(group);
            }
        }
        return list;
    }

    createActionBinder () {
        this.actionBinder = new ActionBinder;
    }
};

const ActionBinder = require('../attr/ActionBinder');