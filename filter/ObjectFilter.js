/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ObjectFilter extends Base {

    static create (data, view) {
        if (data) {
            const {module} = view.meta;
            const config = this.prepareSpawn(data, view);
            return ClassHelper.spawn(config, {module, view});
        }
    }

    static prepareSpawn (data, view) {
        return data.Class
            ? ClassHelper.resolveSpawn(data, view.meta.module)
            : this.getDefaultSpawn(data, view);
    }

    static getDefaultSpawn (data, view) {
        return {
            Class: this,
            solver: this.createSolver(data, view)
        };
    }

    static createSolver (data, view) {
        return new Calc({
            data: ['$condition', data],
            view
        });
    }

    async apply (query) {
        const condition = await this.solver.resolve({
            view: query.view,
            user: query.user,
            query
        });
        query.and(condition);
    }

    log () {
        CommonHelper.log(this.view, this.constructor.name, ...arguments);
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const CommonHelper = require('areto/helper/CommonHelper');
const Calc = require('../calc/Calc');