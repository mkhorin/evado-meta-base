/**
 * @copyright Copyright (c) 2022 Maxim Khorin (maksimovichu@gmail.com)
 *
 * ["$empty", ".attrName1", ".attrName2", ...] - Returns empty when there is any empty
 */
'use strict';

const Base = require('./BaseHandler');

module.exports = class EmptyHandler extends Base {

    resolveTokens (model) {
        let result = '';
        for (let token of this._tokens) {
            let data = token.resolve(model);
            if (CommonHelper.isEmpty(data)) {
                return '';
            }
            if (Array.isArray(data)) {
                if (!data.length) {
                    return '';
                }
                data = data.join(', ');
            }
            result += data;
        }
        return result;
    }
};

const CommonHelper = require('areto/helper/CommonHelper');