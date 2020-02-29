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
        const solver = new ConditionSolver({data, view});
        return {Class: this, module, solver};
    }

    async resolve (query) {
        query.and(await this.solver.resolve(query));
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const ConditionSolver = require('./ConditionSolver');