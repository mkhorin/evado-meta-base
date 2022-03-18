/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./ObjectFilter');

module.exports = class RelationFilter extends Base {

    static create (data, relation) {
        if (data) {
            const attr = relation.attr;
            const view = relation.refClass;
            const module = view.meta.module;
            const config = this.prepareSpawn(data, view);
            return ClassHelper.spawn(config, {attr, module, relation});
        }
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
            const result = this.relation.multiple
                ? await query.all()
                : await query.one();
            model.related.set(this.attr, result);
        }
        this.relation.sortRelatedModels(models);
    }
};

const ClassHelper = require('areto/helper/ClassHelper');