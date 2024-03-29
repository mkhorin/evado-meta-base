/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./FileBehavior');

module.exports = class S3Behavior extends Base {

    static getConstants () {
        return {
            RAW_CLASS: 'model/S3File'
        };
    }

    getSignedDownloadUrl () {
        const file = this.getFilename();
        const name = this.getName();
        return this.getStorage().getSignedDownloadUrl(file, name);
    }

    async beforeValidate () {
        await super.beforeValidate();
        await this.checkFileStat();
    }

    async checkFileStat () {
        if (this.rawFile) {
            if (!await this.rawFile.isEqualStat()) {
                this.owner.addError(this.fileAttr.name, 'File stat is not matched');
            }
        }
    }
};
module.exports.init();