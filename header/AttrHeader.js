/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

// [".$self"] // alias for current attribute name
// [".$self.nestedAttrName"]

const Base = require('./Header');

module.exports = class AttrHeader extends Base {

    prepareData (data) {
        data = this.replaceSelfAttr(data);
        return super.prepareData(data);
    }

    replaceSelfAttr (text) {
        return typeof text === 'string'
            ? text.replace('$self', this.owner.name)
            : text;
    }

    resolveModel (model) {
        model.header.data[this.owner.name] = this._token.resolve(model);
    }
};