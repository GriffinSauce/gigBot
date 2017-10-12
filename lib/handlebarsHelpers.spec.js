import expect from 'expect'
import {
    whitespaceToBr,
    newlineFix,
    dateFormat,
    dateToISO,
    ifCond,
    ifNotSet,
    json,
 } from './handlebarsHelpers';

describe('handlebarsHelpers', function() {
  describe('whitespaceToBr', function() {
    it('should return a string without whitespace untouched', function() {
      expect(whitespaceToBr('thisisanicestring')).toBe('thisisanicestring');
    });
    it('should convert a break to a <br>', function() {
      expect(whitespaceToBr('thisisanicestring\nwithabreak')).toBe('thisisanicestring<br/>withabreak');
    });
    it('should convert multiple breaks to <br>s', function() {
      expect(whitespaceToBr('thisisanicestring\nwith\nbreaks\neven\nmultiline')).toBe('thisisanicestring<br/>with<br/>breaks<br/>even<br/>multiline');
    });
  });
  describe('json', function() {
    it('should convert an object to json', function() {
      expect(json({ test: true })).toBe('{"test":true}');
    });
  });
});