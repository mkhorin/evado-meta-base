/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class RelationFinder extends Base {

    static create (data, relation) {
        const attr = relation.attr;
        try {
            if (data) {
                const module = attr.view.meta.module;
                const config = ClassHelper.resolveSpawn(data, module);
                return ClassHelper.spawn(config, {attr, module, relation});
            }
        } catch (err) {
            attr.log('error', 'Create relation finder:', err);
        }
    }

    execute (query, model) {
        return query;
    }
};

const ClassHelper = require('areto/helper/ClassHelper');