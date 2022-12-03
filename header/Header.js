/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * [".attrName"]
 * [".attrName", "suffix"]
 * ["static text", ".attrName.nestedAttrName", ["$method", ".attrName", "toLowerCase"]]
 * [".$key"] - object ID
 * [".userAttr.$title"] - User title
 *
 * ["$class", ".attrName"] - Resolve class title
 * ["$enum", ".attrName"] - Resolve enum title
 * ["$state", ".attrName"] - Resolve state title
 *
 * ["$method", ".attrName", "toUpperCase"] - value.toUpperCase()
 * ["$moment", ".attrName", "format", "YY"] - moment(value).format("YY")
 * ["$moment", ".values", "format", "YY"] - moment(value1).format("YY"), moment(value2).format("YY"), ...
 *
 * ["$map", "prefix", ".values", "suffix"] - "prefix value1 suffix", "prefix value2 suffix", ...
 * ["$map", "$method", ".strings", "toUpperCase"]
 * ["$map", "$moment", ".dates", "format", "YY"]
 *
 * ["$empty", ".attrName1", ".attrName2", ...] - Returns empty when there is any empty
 * ["$join", "separator", ".attrName1", ".attrName2", ...] - Join not empty values
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class Header extends Base {

    constructor (config) {
        super({
            Token: require('./Token'),
            ...config
        });
        this.init();
    }

    init () {
        this._token = this.Token.create(this.data, this);
    }

    prepareData (data) {
        return data;
    }

    resolve (model) {
        return this._token.resolve(model);
    }

    log (type, message, data) {
        this.owner.log(type, this.wrapClassMessage(message), data);
    }
};