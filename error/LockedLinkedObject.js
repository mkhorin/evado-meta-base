/**
 * @copyright Copyright (c) 2022 Maxim Khorin (maksimovichu@gmail.com)
 */
'use strict';

const Base = require('areto/error/http/Locked');

module.exports = class LockedLinkedObject extends Base {

    constructor (model, link, attr) {
        super('Object {id} locked by link {link}', {
            params: {
                id: model.getId(),
                link: `${link}.${attr.id}`
            }
        });
    }
};