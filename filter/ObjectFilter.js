/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ObjectFilter extends Base {

    static prepareConfiguration (data, view) {
        if (!data) {
            return null;
        }
        const module = view.meta.module;
        if (data.Class) {
            return ClassHelper.resolveSpawn(data, module, {module});
        }
        data = ['$condition', data];
        const solver = new Calc({data, view});
        return {Class: this, module, solver};
    }

    async apply (query) {
        query.and(await this.solver.resolve({
            view: query.view,
            user: query.user,
            query
        }));
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const Calc = require('../calc/Calc');