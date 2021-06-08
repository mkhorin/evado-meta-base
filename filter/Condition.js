/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
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
        const filter = ObjectFilter.prepareConfig(data, view);
        return {Class: this, module, filter};
    }

    async resolve (model) {
        const query = model.findSelf();
        await (new this.filter.Class(this.filter)).apply(query);
        return query.id();
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const ObjectFilter = require('./ObjectFilter');