/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class ModelHeader extends Base {

    data = {};

    get (name) {
        return this.data[name] || this.model.get(name);
    }

    resolve () {
        if (this.model.view.header) {
            this.model.view.header.resolveModel(this.model);
        }
        return this.toString();
    }

    toString () {
        if (this.value) {
            return this.value;
        }
        const id = this.model.getId();
        return id ? String(id) : '';
    }
};