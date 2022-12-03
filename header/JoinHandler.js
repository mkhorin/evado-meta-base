/**
 * @copyright Copyright (c) 2022 Maxim Khorin (maksimovichu@gmail.com)
 *
 * ["$join", "separator", ".attrName1", ".attrName2", ...] - Join not empty values
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class JoinHandler extends Base {

    init () {
        this.separator = this.data[0];
        this.data = this.data.slice(1);
        return super.init();
    }

    resolveTokens (model) {
        const items = [];
        for (const token of this._tokens) {
            const data = token.resolve(model);
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (!CommonHelper.isEmpty(data)) {
                        items.push(data);
                    }
                }
            } else if (!CommonHelper.isEmpty(data)) {
                items.push(data);
            }
        }
        return items.join(this.separator);
    }
};

const CommonHelper = require('areto/helper/CommonHelper');