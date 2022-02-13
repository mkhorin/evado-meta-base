/**
 * @copyright Copyright (c) 2020 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('./Behavior');

module.exports = class SortOrderBehavior extends Base {

    constructor (config) {
        super({
            start: 10,
            step: 10,
            ...config
        });
    }

    afterDefaultValues () {
        return this.setNextNumber();
    }

    async beforeInsert () {
        if (!this.owner.get(this.attrName)) {
            return this.setNextNumber();
        }
    }

    async setNextNumber () {
        let value = await this.getExtremeNumber();
        if (Number.isSafeInteger(value)) {
            value += this.step;
        } else {
            value = this.start;
        }
        this.owner.set(this.attrName, value);
    }

    getExtremeNumber () {
        const direction = this.step > 0 ? -1 : 1;
        return this.owner.class.createQuery()
            .order({[this.attrName]: direction})
            .scalar(this.attrName);
    }

    async update (data, view) {
        const config = {
            module: this.module,
            user: this.user
        };
        for (const id of Object.keys(data)) {
            const model = await view.createQuery(config).byId(id).one();
            if (model) {
                model.set(this.attrName, data[id]);
                await model.forceSave();
            }
        }
    }
};