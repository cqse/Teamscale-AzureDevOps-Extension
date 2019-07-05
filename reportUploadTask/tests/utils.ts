import * as utils from '../utils';
import * as assert from 'assert';
import * as path from 'path';

describe('firstWildcardIndex', function() {
    it('should return null if no wildcards present', function() {
        assert.strictEqual(utils.firstWildcardIndex(""), null);
        assert.strictEqual(utils.firstWildcardIndex("test"), null);
    });

    it('should return index of first wildcard if present', function() {
        assert.strictEqual(utils.firstWildcardIndex("test*"), 4);
        assert.strictEqual(utils.firstWildcardIndex("test*?"), 4);
        assert.strictEqual(utils.firstWildcardIndex("test?*"), 4);
        assert.strictEqual(utils.firstWildcardIndex("*test"), 0);
    });
});

const fixturePath = path.join(__dirname, "fixtures");

describe('resolveFiles', function() {
    it('should throw an exception if an absolutely specified file does not exist', function() {
        assert.throws(() => utils.resolveFiles("does/not/exist.xml"), /Not found/);
    });
    
    it('should throw an exception if pattern matches no files', function() {
        assert.throws(() => utils.resolveFiles("does/not/exist*.xml"), /Did not find/);
    });

    it('should return a single file when it exists', function() {
        assert.deepStrictEqual(utils.resolveFiles(`${fixturePath}/coverage.simple`), [`${fixturePath}/coverage.simple`]);
    });

    it('should return all matching files', function() {
        assert.deepStrictEqual(utils.resolveFiles(`${fixturePath}/**.simple`), 
                [`${fixturePath}/coverage.simple`, `${fixturePath}/coverage2.simple`]);
    });
});

describe('createUploadUrl', function() {
    it('should encode characters that are not allowed in URLs', function() {
        assert.strictEqual(utils.createUploadUrl('http://localhost', 'proj', 'SIMPLE', 'Partition with Spaces', 'encoded message?', 'revision'),
                'http://localhost/p/proj/external-report?format=SIMPLE&revision=revision&partition=Partition%20with%20Spaces&message=encoded%20message%3F');
    });
});
