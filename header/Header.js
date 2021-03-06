/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 *
 * [".attrName"]
 * [".attrName", "suffix"]
 * ["static text", ".attrName.nestedAttrName", ["$method", ".attrName", "toLowerCase"]]
 * [".$key"] - object ID
 * [".userAttr.$title"] - user title
 *
 * ["$class", ".attrName"] - resolve class title
 * ["$enum", ".attrName"] - resolve enum title
 * ["$state", ".attrName"] - resolve state title
 *
 * ["$method", ".attrName", "toUpperCase"] - value.toUpperCase()
 * ["$moment", ".attrName", "format", "YY"] - moment(value).format("YY")
 * ["$moment", ".values", "format", "YY"] - moment(value1).format("YY"), moment(value2).format("YY"), ...
 *
 * ["$map", "prefix", ".values", "suffix"] - "prefix value1 suffix", "prefix value2 suffix", ...
 * ["$map", "$method", ".strings", "toUpperCase"]
 * ["$map", "$moment", ".dates", "format", "YY"]
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