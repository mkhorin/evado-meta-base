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
        this.title = MetaHelper.createTitle(this);
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

    prepare () {
        this.children = this.getAttrs().concat(this.getGroups());
        this.createActionBinder();
        MetaHelper.sortByDataOrderNumber(this.children);
    }

    createActionBinder () {
        this.actionBinder = new ActionBinder({
            owner: this,
            data: this.data.actionBinder
        });
    }

    getAttrs () {
        const list = [];
        for (const attr of this.view.attrs) {
            if (attr.data.group === this.name) {
                list.push(attr);
            }
        }
        return list;
    }

    getGroups () {
        const list = [];
        for (const group of Object.values(this.view.groups)) {
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