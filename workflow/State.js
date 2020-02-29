/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/base/Base');

module.exports = class State extends Base {

    constructor (config) {
        super(config);
        this.name = this.data.name;        
        this.view = this.class.getView(this.data.view);
        this.title = MetaHelper.createTitle(this);
        this.id = `${this.name}.${this.view ? this.view.id : this.class.id}`;
    }

    isDefault () {
        return this.data.defaults;
    }
    
    isReadOnly () {
        return this.data.readOnly;
    }

    getName () {
        return this.name;
    }

    getTitle () {
        return this.title;
    }

    toString () {
        return this.id;
    }
};

const MetaHelper = require('../helper/MetaHelper');