/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 *
 * Total size of all model files
 */
'use strict';

const Base = require('./TotalFileSizeValidator');

module.exports = class ModelFileSizeValidator extends Base {

    async validateModel (model) {
        let size = 0;
        for (const attr of model.view.refAttrs) {
            const {fileItem} = attr.relation.refClass.behaviors;
            if (fileItem) {
                size += await this.getTotalSize(attr, model);
            }
        }
        this.checkTotalSize(size, '', model);
    }
};