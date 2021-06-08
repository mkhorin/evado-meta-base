/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class SignatureDataCollector extends Base {

    constructor (config) {
        super({
            maxDepth: 1,
            ...config
        });
    }

    async getModelData (model, depth = 0) {
        if (!model || depth > this.maxDepth) {
            return null;
        }
        const result = [];
        for (const attr of model.view.signedAttrs) {
            result.push(await this.getAttrData(attr, model, depth));
        }
        return result;
    }

    getAttrData (attr, model, depth) {
        if (attr.isRef()) {
            return this.getRelationData(attr, model, depth);
        }
        if (attr.isFile()) {
            return this.getFileData(attr, model);
        }
        return model.get(attr);
    }

    async getRelationData (attr, model, depth) {
        const models = await model.related.resolve(attr);
        if (!Array.isArray(models)) {
            return this.getModelData(models, depth + 1);
        }
        const result = [];
        for (const model of models) {
            result.push(await this.getModelData(model, depth + 1));
        }
        return result;
    }

    getFileData (attr, model) {
        const behavior = model.createFileBehavior();
        return behavior
            ? behavior.calculateHash()
            : model.get(attr);
    }
};