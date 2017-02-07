// test that renameCollection gets audited

if (TestData.testData !== undefined) {
    load(TestData.testData + '/audit/_audit_helpers.js');
} else {
    load('jstests/audit/_audit_helpers.js');
}

var testDBName = 'audit_rename_collection';

auditTest(
    'renameCollection',
    function(m) {
        testDB = m.getDB(testDBName);
        assert.commandWorked(testDB.dropDatabase());

        var oldName = 'john';
        var newName = 'christian';

        assert.commandWorked(testDB.createCollection(oldName));
        assert.commandWorked(testDB.getCollection(oldName).renameCollection(newName));

        var auditColl = getAuditEventsCollection(m, testDBName);
        var checkAuditLogForSingleRename = function() {
            assert.eq(1, auditColl.count({
                atype: "renameCollection",
                ts: withinTheLastFewSeconds(),
                'params.old': testDBName + '.' + oldName,
                'params.new': testDBName + '.' + newName,
                result: 0,
            }), "FAILED, audit log: " + tojson(auditColl.find().toArray()));
        }
        checkAuditLogForSingleRename();

        assert.commandFailed(testDB.getCollection(oldName).renameCollection(newName));

        // Second rename won't be audited because it did not succeed.
        checkAuditLogForSingleRename();
    },
    { /* no special mongod options */ }
);
