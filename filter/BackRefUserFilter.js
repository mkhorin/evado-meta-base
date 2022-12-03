/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class BackRefUserFilter extends Base {

    constructor (config) {
        super({
            attr: 'executor',
            userAttr: 'user',
            ...config
        });
    }

    async apply (query) {
        const user = query.controller.user.getId();
        const {relation} = query.view.class.getAttr(this.attr);
        const refQuery = relation.refClass.find({[this.userAttr]: user});
        const ids = await refQuery.column(this.attr);
        return query.and({[query.view.getKey()]: ids});
    }
};