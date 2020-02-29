/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class TreeView extends Base {

    constructor (config) {
        super(config);
        this.levels = this.createLevels(this.data);
        this.disabled = this.disabled || !this.levels.length;
        this.recursiveLevel = this.getRecursiveLevel();
    }

    isActive () {
        return !this.disabled;
    }

    getLevel (index) {
        return this.levels[index] instanceof TreeViewLevel
            ? this.levels[index]
            : this.recursiveLevel;
    }

    getRecursiveLevel () {
        const level = this.levels[this.levels.length - 1];
        return level && level.data.recursive ? level : null;
    }

    createLevels (items) {
        const levels = [];
        let sourceClass = this.class;
        for (const data of items) {
            const level = new TreeViewLevel({treeView: this, sourceClass, data});
            sourceClass = level.getRefClass();
            levels.push(level);
        }
        return levels;
    }

    log () {
        CommonHelper.log(this.owner, this.constructor.name, ...arguments);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');
const TreeViewLevel = require('./TreeViewLevel');