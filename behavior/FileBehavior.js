/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class FileBehavior extends Base {

    static getConstants () {
        return {
            FILE_ATTR: 'file',
            NAME_ATTR: 'name',
            SIZE_ATTR: '_size',
            MIME_ATTR: '_mime',
            RAW_FILE_ATTR: 'file'
        };
    }

    static initConfiguration (data) {
        data.rule = this.createValidatorRule(data);
    }

    static createValidatorRule (data) {
        const params = {};
        for (const key of ['imageOnly', 'maxSize', 'minSize', 'mimeTypes', 'extensions']) {
            if (data[key]) {
                params[key] = data[key];
            }
        }
        return Object.values(params).length
            ? [[this.RAW_FILE_ATTR], 'file', params]
            : null;
    }

    static isImage (model) {
        const mime = model.get(this.MIME_ATTR);
        return mime && mime.indexOf('image') === 0;
    }

    static getName (model) {
        return model.get(this.NAME_ATTR);
    }

    static getSize (model) {
        return model.get(this.SIZE_ATTR);
    }

    isImage () {
        return this.getMime().indexOf('image') === 0;
    }

    getFilename () {
        return this.owner.get(this.FILE_ATTR);
    }

    getName () {
        return this.owner.get(this.NAME_ATTR);
    }

    getMime () {
        return this.owner.get(this.MIME_ATTR);
    }

    getRawFile () {
        return this.module.getClass('model/RawFile');
    }

    getStorage () {
        return this.module.getFileStorage();
    }

    findPending (id) {
        return this.spawn(this.getRawFile()).findPending(id, this.owner.user);
    }

    beforeValidate () {
        return this.setFile();
    }

    beforeInsert () {
        if (this.rawFile && !this.getName()) {
            this.owner.set(this.NAME_ATTR, this.rawFile.getName());
        }
        this.assignRawData();
    }

    beforeUpdate () {
        this.assignRawData();
    }

    afterInsert () {
        if (this.rawFile) {
            return this.rawFile.directUpdate({owner: this.owner.getId()});
        }
    }

    async afterUpdate () {
        if (this.rawFile) {
            await this.deleteRawFile(); // delete current raw file
            await this.rawFile.directUpdate({owner: this.owner.getId()}); // bind a new raw file
            await this.getStorage().delete(this.owner.getOldValue(this.FILE_ATTR));
        }
    }

    afterDelete () {
        return this.deleteRawFile();
    }

    async setFile () {
        const value = this.owner.get(this.FILE_ATTR);
        if (value && value !== this.owner.getOldValue(this.FILE_ATTR)) {
            this.rawFile = await this.findPending(value).one();
            if (!this.rawFile) {
                this.owner.addError(this.FILE_ATTR, 'File not found');
            }
        }
    }

    assignRawData () {
        if (this.rawFile) {
            this.owner.set(this.FILE_ATTR, this.rawFile.getFilename());
            this.owner.set(this.SIZE_ATTR, this.rawFile.getSize());
            this.owner.set(this.MIME_ATTR, this.rawFile.getMime());
        }
    }

    async deleteRawFile () {
        const RawFile = this.getRawFile();
        const models = await this.spawn(RawFile).find({owner: this.owner.getId()}).all();
        return RawFile.delete(models);
    }
};
module.exports.init();