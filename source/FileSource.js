/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./BaseSource');

module.exports = class FileSource extends Base {

    constructor (config) {
        super({
            directory: 'base',
            classDirectory: 'class',
            viewDirectory: 'view',
            ...config
        });
    }

    getPath () {
        return this.meta.getPath(this.directory, ...arguments);
    }

    async load () {
        return {
            class: await this.loadClasses(),
            view: await this.loadViews()
        };
    }

    async loadClasses () {
        const dir = this.getPath(this.classDirectory);
        const files = await FileHelper.readDirectory(dir);
        const items = [];
        for (const file of FileHelper.filterJsonFiles(files)) {
            try {
                const baseName = FileHelper.getBasename(file);
                const data = await FileHelper.readJsonFile(path.join(dir, file));
                data.name = baseName;
                items.push(data);
            } catch (err) {
                this.meta.log('error', `Invalid JSON: ${path.join(dir, file)}`, err);
            }
        }
        return items;
    }

    async loadViews () {
        const items = [];
        const dir = this.getPath(this.viewDirectory);
        for (const file of await FileHelper.readDirectory(dir)) {
            const classDirectory = path.join(dir, file);
            const stat = await fs.promises.stat(classDirectory);
            if (stat.isDirectory()) {
                items.push(...await this.loadClassViews(file, classDirectory));
            }
        }
        return items;
    }

    async loadClassViews (className, dir) {
        const items = [];
        const files = await FileHelper.readDirectory(dir);
        for (const file of FileHelper.filterJsonFiles(files)) {
            const data = await FileHelper.readJsonFile(path.join(dir, file));
            data.class = className;
            data.name = FileHelper.getBasename(file);
            items.push(data);
        }
        return items;
    }
};

const FileHelper = require('areto/helper/FileHelper');
const fs = require('fs');
const path = require('path');