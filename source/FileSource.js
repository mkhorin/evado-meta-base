/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./BaseSource');

module.exports = class FileSource extends Base {

    constructor (config) {
        super({
            directory: 'document',
            classDirectory: 'class',
            viewDirectory: 'view',
            ...config
        });
    }

    getPath () {
        return this.meta.getPath(this.directory, ...arguments);
    }

    async load () {
        this.clear();
        await this.loadClasses();
        await this.loadViews();
        return this._data;
    }

    loadClasses () {
        return this.loadJsonItems('class', this.getPath(this.classDirectory));
    }

    async loadViews () {
        const dir = this.getPath(this.viewDirectory);
        for (const file of await FileHelper.readDirectory(dir)) {
            const classDirectory = path.join(dir, file);
            const stat = await fs.promises.stat(classDirectory);
            if (stat.isDirectory()) {
                await this.loadClassViews(file, classDirectory);
            }
        }
    }

    async loadClassViews (metaClass, dir) {
        const files = await FileHelper.readDirectory(dir);
        for (const file of FileHelper.filterJsonFiles(files)) {
            const data = await FileHelper.readJsonFile(path.join(dir, file));
            data.class = metaClass;
            data.name = FileHelper.getBasename(file);
            this._data.view.push(data);
        }
    }

    async loadJsonItems (type, dir) {
        const files = await FileHelper.readDirectory(dir);
        for (const file of FileHelper.filterJsonFiles(files)) {
            try {
                const data = await FileHelper.readJsonFile(path.join(dir, file));
                data.name = FileHelper.getBasename(file);
                this._data[type].push(data);
            } catch (err) {
                this.meta.log('error', `Invalid JSON: ${path.join(dir, file)}`, err);
            }
        }
    }
};

const fs = require('fs');
const path = require('path');
const FileHelper = require('areto/helper/FileHelper');