/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class TreeViewLevel extends Base {

    constructor (config) {
        super(config);
        this.setRefAttr();
    }

    getOption (key, defaults) {
        return NestedValueHelper.get(key, this.data.options, defaults);
    }

    getRefClass () {
        return this.refClass;
    }

    getRefView (key) {
        return this.refView || this.refAttr.getRefView(key);
    }

    setRefAttr () {
        if (this.sourceClass) {
            this.refAttr = this.sourceClass.getAttr(this.data.refAttr);
        }
        if (!this.refAttr || !this.refAttr.relation) {
            return this.treeView.log('error', `Invalid attribute: ${this.data.refAttr}`);
        }
        this.refClass = this.refAttr.relation.refClass;
        this.refView = this.refClass.getView(this.data.view) || this.refAttr.getListView();
    }
};

const NestedValueHelper = require('areto/helper/NestedValueHelper');