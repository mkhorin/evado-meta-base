/**
 * @copyright Copyright (c) 2020 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class RefUserFilter extends Base {

    constructor (config) {
        super({
            attr: 'executor',
            userAttr: 'user',
            ...config
        });
    }

    async resolve (query) {
        const user = query.controller.user.getId();
        const attr = query.view.class.getAttr(this.attr);
        const ids = await attr.relation.refClass.find().and({[this.userAttr]: user}).ids();
        return query.and({[this.attr]: ids});
    }
};