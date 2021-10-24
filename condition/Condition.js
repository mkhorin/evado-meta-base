/**
 * @copyright Copyright (c) 2021 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Condition extends Base {

    static prepareConfig (data, view) {
        if (!data) {
            return null;
        }
        const module = view.meta.module;
        if (data.Class) {
            return ClassHelper.resolveSpawn(data, module, {module});
        }
        if (!Array.isArray(data)) {
            data = this.normalizeHashData(data);
        }
        return {Class: this, data, module};
    }

    static normalizeHashData (data) {
        const result = [];
        for (const key of Object.keys(data)) {
            result.push(this.normalizeHashDataItem(key, data));
        }
        return result.length > 1 ? ['$and', ...result] : result[0];
    }

    static normalizeHashDataItem (key, data) {
        return ['$=', this.normalizeHashDataKey(key), data[key]];
    }

    static normalizeHashDataKey (key) {
        return key.indexOf('.') !== 0 ? `.${key}` : key;
    }

    async resolve (model) {
        const calc = new Calc({
            view: model.view,
            data: this.data
        });
        return await calc.resolve({
            view: model.view,
            user: model.user,
            model
        });
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const Calc = require('../calc/Calc');