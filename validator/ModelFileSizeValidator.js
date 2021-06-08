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
        for (let attr of model.view.refAttrs) {
            let file = attr.relation.refClass.behaviors.fileItem;
            if (file) {
                size += await this.getTotalSize(attr, model);
            }
        }
        this.checkTotalSize(size, '', model);
    }
};