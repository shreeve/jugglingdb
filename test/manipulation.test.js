// This test written in mocha+should.js
const should = require('./init.js');

let db, Person;

describe('manipulation', function() {

    before(function(done) {
        db = getSchema();

        Person = db.define('Person', {
            name: { type: String, name: 'full_name' },
            gender: String,
            married: Boolean,
            age: { type: Number, index: true },
            dob: Date,
            createdAt: { type: Number, default: Date.now, name: 'created_at' }
        });

        db.automigrate(done);

    });

    describe('create', function() {

        before(function(done) {
            Person.destroyAll(done);
        });

        it('should create instance', function(done) {
            Person.create({ name: 'Anatoliy' }).then(function(p) {
                p.name.should.equal('Anatoliy');
                should.exist(p);
                Person.find(p.id, function(err, person) {
                    person.id.should.equal(p.id);
                    person.name.should.equal('Anatoliy');
                    done();
                });
            }).catch(done);
        });

        it('should return instance of object', function(done) {
            Person.create().then(function(person) {
                should.exist(person);
                person.should.be.an.instanceOf(Person);
                done();
            }).catch(done);
        });

        it('should work when called without callback', function(done) {
            Person.afterCreate = function(next) {
                this.should.be.an.instanceOf(Person);
                this.name.should.equal('Nickolay');
                should.exist(this.id);
                Person.afterCreate = null;
                next();
                setTimeout(done, 10);
            };
            Person.create({ name: 'Nickolay' });
        });

        it('should create instance with blank data', function(done) {
            Person.create(function(err, p) {
                should.not.exist(err);
                should.exist(p);
                should.not.exists(p.name);
                Person.find(p.id, function(err, person) {
                    person.id.should.equal(p.id);
                    should.not.exists(person.name);
                    done();
                });
            });
        });

        it('should work when called with no data and callback', function(done) {
            Person.afterCreate = function(next) {
                this.should.be.an.instanceOf(Person);
                should.not.exist(this.name);
                should.exist(this.id);
                Person.afterCreate = null;
                next();
                setTimeout(done, 30);
            };
            Person.create();
        });

        it('should create batch of objects', function(done) {
            const batch = [{ name: 'Shaltay' }, { name: 'Boltay' }, {}];
            Person.create(batch, function(e, ps) {
                should.not.exist(e);
                should.exist(ps);
                ps.should.be.instanceOf(Array);
                ps.should.have.lengthOf(batch.length);

                Person.validatesPresenceOf('name');
                Person.create(batch, function(errors, persons) {
                    delete Person._validations;
                    should.exist(errors);
                    errors.should.have.lengthOf(batch.length);
                    should.not.exist(errors[0]);
                    should.not.exist(errors[1]);
                    should.exist(errors[2]);

                    should.exist(persons);
                    persons.should.have.lengthOf(batch.length);
                    should.not.exist(persons[0].errors);
                    should.exist(persons[2].errors);
                    done();
                });
            });
        });
    });

    describe('save', function() {

        it('should save new object', function(done) {
            const p = new Person;
            p.save(function(err) {
                should.not.exist(err);
                should.exist(p.id);
                done();
            });
        });

        it('should save existing object', function(done) {
            Person.findOne(function(err, p) {
                should.not.exist(err);
                p.name = 'Hans';
                p.propertyChanged('name').should.be.true;
                p.save(function(err) {
                    should.not.exist(err);
                    p.propertyChanged('name').should.be.false;
                    Person.findOne(function(err, p) {
                        should.not.exist(err);
                        p.name.should.equal('Hans');
                        p.propertyChanged('name').should.be.false;
                        done();
                    });
                });
            });
        });

        it('should save invalid object (skipping validation)', function(done) {
            Person.findOne(function(err, p) {
                should.not.exist(err);
                p.isValid = function(done) {
                    process.nextTick(done);
                    return false;
                };
                p.name = 'Nana';
                p.save(function(err) {
                    should.exist(err);
                    p.propertyChanged('name').should.be.true;
                    p.save({ validate: false }, function(err) {
                        should.not.exist(err);
                        p.propertyChanged('name').should.be.false;
                        done();
                    });
                });
            });
        });

        it('should save invalid new object (skipping validation)', function(done) {
            const p = new Person();
            p.isNewRecord().should.be.true;

            p.isValid = function(done) {
                if (done) {
                    process.nextTick(done);
                }
                return false;
            };
            p.isValid().should.be.false;

            p.save({ validate: false }, function(err) {
                should.not.exist(err);
                p.isNewRecord().should.be.false;
                p.isValid().should.be.false;
                done();
            });
        });

        it('should save throw error on validation', function() {
            Person.findOne(function(err, p) {
                should.not.exist(err);
                p.isValid = function(cb) {
                    cb(false);
                    return false;
                };
                p.save({
                    'throws': true
                }).catch(function(err) {
                    should.exist(err);
                });
            });
        });

        it.skip('should save with custom fields', function() {
            return Person.create({ name: 'Anatoliy' }, function(err, p) {
                should.exist(p.id);
                should.exist(p.name);
                should.not.exist(p['full_name']);
                const storedObj = JSON.parse(db.adapter.cache.Person[p.id]);
                should.exist(storedObj['full_name']);
            });
        });

    });

    describe('updateAttributes', function() {
        let person;

        before(function(done) {
            Person.destroyAll(function() {
                Person.create().then(function(pers) {
                    person = pers;
                    done();
                });
            });
        });

        it('should update one attribute', function(done) {
            person.updateAttribute('name', 'Paul Graham', function(err, p) {
                should.not.exist(err);
                Person.all(function(e, ps) {
                    should.not.exist(err);
                    ps.should.have.lengthOf(1);
                    ps.pop().name.should.equal('Paul Graham');
                    done();
                });
            });
        });
    });

    describe('destroy', function() {

        it('should destroy record', function(done) {
            Person.create(function(err, p) {
                p.destroy(function(err) {
                    should.not.exist(err);
                    Person.exists(p.id, function(err, ex) {
                        ex.should.not.be.ok;
                        done();
                    });
                });
            });
        });

        it('should destroy all records', function(done) {
            Person.destroyAll(function(err) {
                should.not.exist(err);
                Person.all(function(err, posts) {
                    posts.should.have.lengthOf(0);
                    Person.count(function(err, count) {
                        count.should.eql(0);
                        done();
                    });
                });
            });
        });

        // TODO: implement destroy with filtered set
        it('should destroy filtered set of records');
    });

    describe('iterate', function() {

        before(function(next) {
            Person.destroyAll().then(function() {
                const ps = [];
                for (let i = 0; i < 507; i += 1) {
                    ps.push({ name: 'Person ' + i });
                }
                Person.create(ps).then(function(x) {
                    next();
                });
            });
        });

        it('should iterate through the batch of objects', function(done) {
            let num = 0;
            Person.iterate({ batchSize: 100, limit: 507 }, function(person, next, i) {
                num += 1;
                next();
            }, function(err) {
                num.should.equal(507);
                done();
            });
        });

        it('should take limit into account', function(done) {
            let num = 0;
            Person.iterate({ batchSize: 20, limit: 21 }, function(person, next, i) {
                num += 1;
                next();
            }, function(err) {
                num.should.equal(21);
                done();
            });
        });

        it('should process in concurrent mode', function(done) {
            let num = 0, time = Date.now();
            Person.iterate({ batchSize: 10, limit: 21, concurrent: true }, function(person, next, i) {
                num += 1;
                setTimeout(next, 20);
            }, function(err) {
                num.should.equal(21);
                should.ok(Date.now() - time < 300, 'should work in less than 300ms');
                done();
            });
        });
    });

    describe('initialize', function() {
        it('should initialize object properly', function() {
            let hw = 'Hello word',
                now = Date.now(),
                person = new Person({ name: hw });

            person.name.should.equal(hw);
            person.propertyChanged('name').should.be.false;
            person.name = 'Goodbye, Lenin';
            person.name_was.should.equal(hw);
            person.propertyChanged('name').should.be.true;
            (person.createdAt >= now).should.be.true;
            person.isNewRecord().should.be.true;
        });

        it('should work when constructor called as function', function() {
            const p = Person({ name: 'John Resig' });
            p.should.be.an.instanceOf(Person);
            p.name.should.equal('John Resig');
        });
    });
});
