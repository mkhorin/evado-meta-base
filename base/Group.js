/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Group extends Base {

    constructor (config) {
        super(config);
        this.init();
    }

    init () {
        this.name = this.data.name;
        this.class = this.view.class;
        this.id = `${this.name}.${this.view.id}`;
        this.options = this.data.options || {};
        this.type = this.data.type || 'set';
        this.title = MetaHelper.createLabel(this);
        this.hint = this.data.hint;
        this.setTranslationKey();
        this.setTemplateKeys();
    }

    isGroup () {
        return true;
    }

    isActive () {
        return this.data.active;
    }

    getMeta () {
        return this.class.meta;
    }

    getTitle () {
        return this.title;
    }

    getAllAttrs () {
        if (!this._allAttrs) {
            this._allAttrs = this.attrs.slice();
            for (const group of this.groups) {
                this._allAttrs.push(...group.getAllAttrs());
            }
        }
        return this._allAttrs;
    }

    getAllGroups () {
        if (!this._allGroups) {
            this._allGroups = this.groups.slice();
            for (const group of this.groups) {
                this._allGroups.push(...group.getAllGroups());
            }
        }
        return this._allGroups;
    }

    prepare () {
        this.attrs = this.forceGetAttrs();
        this.groups = this.forceGetGroups();
        this.children = this.attrs.concat(this.groups);
        this.createActionBinder();
        MetaHelper.sortByDataOrderNumber(this.attrs);
        MetaHelper.sortByDataOrderNumber(this.groups);
        MetaHelper.sortByDataOrderNumber(this.children);
    }

    createActionBinder () {
        this.actionBinder = new ActionBinder({
            owner: this,
            data: this.data.actionBinder
        });
    }

    forceGetAttrs () {
        const list = [];
        for (const attr of this.view.attrs) {
            if (attr.data.group === this.name) {
                list.push(attr);
            }
        }
        return list;
    }

    forceGetGroups () {
        const list = [];
        for (const group of Object.values(this.view.grouping.groupMap)) {
            if (group.data.parent === this.name) {
                list.push(group);
            }
        }
        return list;
    }

    setTemplateKeys () {
        if (this.view.isClass()) {
            this.templateKey = `_group/${this.class.name}/${this.name}`;
        } else {
            this.templateKey = `_group/${this.class.name}/${this.view.basename}/${this.name}`;
            this.parentTemplateKey = `_group/${this.class.name}/${this.name}`;
        }
    }

    setTranslationKey () {
        const base = `${this.class.translationKey}.group.${this.name}`;
        this.translationKey = this.view.isClass() ? base : `${base}.${this.view.name}`;
    }

    log () {
        CommonHelper.log(this.getMeta(), `${this.constructor.name}: ${this.id}`, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');
const MetaHelper = require('../helper/MetaHelper');
const ActionBinder = require('../attr/ActionBinder');