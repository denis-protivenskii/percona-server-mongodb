// test that system.users writes get audited

if (TestData.testData !== undefined) {
    load(TestData.testData + '/audit/_audit_helpers.js');
} else {
    load('jstests/audit/_audit_helpers.js');
}

var testDBName = 'audit_create_drop_update_user';

auditTest(
    '{create/drop/update}User',
    function(m) {
        testDB = m.getDB(testDBName);

        // use admin DB to count matching users in admonDB.system.users
        var adminDB = m.getDB('admin');
        adminDB.auth('admin','admin');

        var userObj = { user: 'john', pwd: 'john', roles: [ { role:'userAdmin', db:testDBName} ] };
        testDB.createUser(userObj);

        var auditColl = getAuditEventsCollection(m, testDBName);
        assert.eq(1, auditColl.count({
            atype: "createUser",
            ts: withinTheLastFewSeconds(),
            'params.db': testDBName,
            'params.user': userObj.user,
            //'params.roles': userObj.roles,
            'params.roles': { $elemMatch: userObj.roles[0] },
            result: 0,
        }), "FAILED, audit log: " + tojson(auditColl.find().toArray()));

        var updateObj = { roles: [ { role:'userAdmin', db:testDBName}, { role:'dbAdmin', db:testDBName} ] }
        testDB.updateUser(userObj.user, updateObj);
        assert.eq(1, adminDB.system.users.count({ user: userObj.user, roles: updateObj.roles }),
                     "system.users update did not update role for user: " + userObj.user);
        auditColl = getAuditEventsCollection(m, testDBName);
        assert.eq(1, auditColl.count({
            atype: "updateUser",
            ts: withinTheLastFewSeconds(),
            'params.db': testDBName,
            'params.user': userObj.user,
            //'params.roles': updateObj.roles,
            'params.roles': { $elemMatch: updateObj.roles[0] },
            'params.roles': { $elemMatch: updateObj.roles[1] },
            result: 0,
        }), "FAILED, audit log: " + tojson(auditColl.find().toArray()));

        testDB.removeUser(userObj.user);
        assert.eq(0, testDB.system.users.count({ user: userObj.user }),
                     "removeUser did not remove user:" + userObj.user);
        auditColl = getAuditEventsCollection(m, testDBName);
        assert.eq(1, auditColl.count({
            atype: "dropUser",
            ts: withinTheLastFewSeconds(),
            'params.db': testDBName,
            'params.user': userObj.user,
            result: 0,
        }), "FAILED, audit log: " + tojson(auditColl.find().toArray()));
    },
    { /* no special mongod options */ }
);
