/**
 * @copyright Copyright (c) 2021 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const {expect} = require('chai');
const {ObjectID} = require('mongodb');
const TypeHelper = require('../../../helper/TypeHelper');
const types = TypeHelper.TYPES;

describe('TypeHelper', ()=> {

    it('hasType', ()=> {
        expect(TypeHelper.hasType('string')).to.eql(true);
        expect(TypeHelper.hasType(null)).to.eql(false);
        expect(TypeHelper.hasType('none')).to.eql(false);
    });

    it('cast', ()=> {
        expect(TypeHelper.cast(0, types.BOOLEAN)).to.eql(false);
        expect(TypeHelper.cast(1, types.BOOLEAN)).to.eql(true);
        expect(TypeHelper.cast('5fe9393694bba9454894c8c1', types.ID)).to.eql(ObjectID('5fe9393694bba9454894c8c1'));
        expect(TypeHelper.cast('none', types.ID)).to.eql(null);
        expect(TypeHelper.cast('3', types.INTEGER)).to.eql(3);
        expect(TypeHelper.cast(2, types.STRING)).to.eql('2');
        expect(TypeHelper.cast(['1', '2', '3'], types.INTEGER)).to.eql([1, 2, 3]);
    });
});