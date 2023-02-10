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
        const names = await FileHelper.readDirectory(dir);
        const items = [];
        const jsonNames= FileHelper.filterJsonFiles(names);
        for (const name of jsonNames) {
            const file = path.join(dir, name);
            const data = await this.readJsonFile(file);
            if (data) {
                data.name = FileHelper.getBasename(name);
                items.push(data);
            }
        }
        return items;
    }

    async loadViews () {
        const items = [];
        const dir = this.getPath(this.viewDirectory);
        const names = await FileHelper.readDirectory(dir);
        for (const name of names) {
            const classDirectory = path.join(dir, name);
            const stat = await fs.promises.stat(classDirectory);
            if (stat.isDirectory()) {
                const views = await this.loadViewsByClass(name, classDirectory);
                items.push(...views);
            }
        }
        return items;
    }

    async loadViewsByClass (className, dir) {
        const items = [];
        const files = await FileHelper.readDirectory(dir);
        const jsonFiles = FileHelper.filterJsonFiles(files);
        for (const name of jsonFiles) {
            const file = path.join(dir, name);
            const data = await this.readJsonFile(file);
            if (data) {
                data.class = className;
                data.name = FileHelper.getBasename(name);
                items.push(data);
            }
        }
        return items;
    }

    async readJsonFile (file) {
        try {
            return await FileHelper.readJsonFile(file);
        } catch (err) {
            this.meta.log('error', `Invalid JSON: ${file}`, err);
        }
    }
};

const FileHelper = require('areto/helper/FileHelper');
const fs = require('fs');
const path = require('path');