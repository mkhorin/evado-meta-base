/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class FileBehavior extends Base {

    static getConstants () {
        return {
            NAME_ATTR: 'name',
            SIZE_ATTR: '_size',
            TYPE_ATTR: '_type',
            HASH_ATTR: '_hash',
            RAW_CLASS: 'model/RawFile'
        };
    }

    static prepareSpawn (data, view) {
        data.fileAttr = view.fileAttrs[0];
        if (!data.fileAttr) {
            return this.log(view, 'error', 'File attribute not found');
        }
        data.nameAttr = view.getAttr(data.nameAttr);
        data.rawClass = data.rawClass || this.RAW_CLASS;
        data.rule = this.createValidatorRule(data);
        return data;
    }

    static createValidatorRule (data) {
        const params = this.createValidatorParams(data);
        return params ? ['file', 'file', params] : null;
    }

    static createValidatorParams (data) {
        const params = {};
        const keys = [
            'imageOnly',
            'maxSize',
            'minSize',
            'types',
            'extensions'
        ];
        for (const key of keys) {
            if (data[key]) {
                params[key] = data[key];
            }
        }
        if (Object.values(params).length) {
            return params;
        }
    }

    isImage () {
        return this.getMediaType()?.indexOf('image') === 0;
    }

    isThumbnails () {
        return this.getStorage()?.isThumbnails();
    }

    getFilename () {
        return this.get(this.fileAttr);
    }

    getName () {
        return this.nameAttr ? this.get(this.nameAttr) : null;
    }

    getMediaType () {
        return this.get(this.TYPE_ATTR);
    }

    getHash () {
        return this.get(this.HASH_ATTR);
    }

    getSize () {
        return this.get(this.SIZE_ATTR);
    }

    getRawClass () {
        return this.module.getClass(this.rawClass);
    }

    getStorage () {
        return this.module.get(this.getRawClass().STORAGE);
    }

    findPending (id) {
        return this.spawn(this.getRawClass()).findPending(id, this.owner.user);
    }

    beforeValidate () {
        const value = this.get(this.fileAttr);
        const oldValue = this.getOldValue(this.fileAttr);
        if (!value) {
            return this.set(this.fileAttr, oldValue);
        }
        if (value !== oldValue) {
            return this.setRawFile();
        }
    }

    beforeInsert () {
        this.setNameOnEmpty();
        return this.assignRawData();
    }

    beforeUpdate () {
        return this.assignRawData();
    }

    afterInsert () {
        if (this.rawFile) {
            return this.updateRawOwner();
        }
    }

    async afterUpdate () {
        if (this.rawFile) {
            await this.deleteRawFile(); // delete current raw file
            await this.updateRawOwner(); // bind a new raw file
            const file = this.getOldValue(this.fileAttr);
            await this.getStorage().deleteFile(file);
        }
    }

    afterDelete () {
        return this.deleteRawFile();
    }

    updateRawOwner () {
        return this.rawFile.directUpdate({
            owner: this.getId()
        });
    }

    setNameOnEmpty () {
        if (this.rawFile && this.nameAttr && !this.getName()) {
            const name = this.rawFile.getName();
            this.set(this.nameAttr, name);
        }
    }

    async setRawFile () {
        const id = this.get(this.fileAttr);
        const query = this.findPending(id);
        this.rawFile = await query.one();
        if (!this.rawFile) {
            this.owner.addError(this.fileAttr.name, 'File not found');
        }
    }

    async assignRawData () {
        if (this.rawFile) {
            this.set(this.fileAttr, this.rawFile.getFilename());
            this.set(this.SIZE_ATTR, this.rawFile.getSize());
            this.set(this.TYPE_ATTR, this.rawFile.getMediaType());
            if (this.hashing) {
                const hash = await this.calculateHash();
                this.set(this.HASH_ATTR, hash);
            }
        }
    }

    calculateHash () {
        return this.getStorage().getHash(this.getFilename());
    }

    async deleteRawFile () {
        const RawClass = this.getRawClass();
        const query = this.spawn(RawClass).find({
            owner: this.getId()
        });
        const models = await query.all();
        await RawClass.delete(models);
    }
};
module.exports.init();