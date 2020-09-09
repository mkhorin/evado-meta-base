/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class RelationFilter extends Base {

    static create (data, relation) {
        if (!data) {
            return null;
        }
        const attr = relation.attr;
        const view = relation.refClass;
        const module = view.meta.module;
        if (data.Class) {
            const config = ClassHelper.resolveSpawn(data, module);
            return ClassHelper.spawn(config, {attr, module, relation});
        }
        data = ['$condition', data];
        const solver = new Calc({data, view});
        return new this({solver, attr, module, relation});
    }

    async filter (query, model) {
        return query.and(await this.solver.resolve({query, model}));
    }

    async apply (query, model) {
        await this.relation.setQueryByDoc(query, model.getValues());
        return this.filter(query, model);
    }

    async applyForAll (query, models) {
        const initial = query.getWhere();
        for (const model of models) {
            query.where(initial);
            await this.apply(query, model);
            query.setRelatedDepth(model.related.depth + 1);
            await query.filterRelatedModels();
            const items = await query.all();
            model.related.set(this.attr, this.relation.multiple ? items : (items[0] || null));
        }
        this.relation.sortRelatedModels(models);
    }
};

const ClassHelper = require('areto/helper/ClassHelper');
const Calc = require('../calc/Calc');