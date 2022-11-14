'use strict';

var envFactory = require('../..');
var t = require('chai').assert;
var _ = require('lodash');

describe('.getOrElseAll', function() {
  var env;
  var eventsFound = {};
  var eventsFallback = {};

  beforeEach(function() {
    env = envFactory();
    env
      .on(env.EVENT_FOUND, function(fullKeyName, value) {
        eventsFound[fullKeyName] = value;
      })
      .on(env.EVENT_FALLBACK, function(fullKeyName, $default) {
        eventsFallback[fullKeyName] = $default;
      });
    process.env = {};
    process.env.AMQP_LOGIN = 'plop';
    process.env.AMQP_GOOD_PORT = 10;
    process.env.AMQP_CONNECT = 'tRue';
    process.env.AMQP_CONNECT2 = 'false';
    process.env.AMQP_PASSWORD = '';
    process.env.A_B_C_DOVERRIDE = '2,3,4';
    process.env.MY_AWESOME_ARRAY_ALIASE_D = '5,7,8';
  });

  it('should emit events', function(done) {
    var doneAfterTwoCall = _.after(2, done);
    env
      .on(env.EVENT_FOUND, function(fullKeyName, value) {
        console.log('[env] %s was defined, using: %s', fullKeyName, String(value));
        doneAfterTwoCall();
      })
      .on(env.EVENT_FALLBACK, function(fullKeyName, $default) {
        console.log('[env] %s was not defined, using default: %s', fullKeyName, String($default));
        doneAfterTwoCall();
      })
      .getOrElseAll({
        node: {
          env: 'production'
        },
        a: {
          b: 'ok'
        }
      });
  });

  it('should return an object', function() {
    var config = env.getOrElseAll({
      AMQP: {
        LoGiN: 'guest', // add a bug inside key name (mix lower/upper case)
        PASSWORD: 'guest',
        HOST: 'localhost',
        PORT: 5672,
        connect: false,
        connect2: true,
        PLOP: {
          ok: {
            heyheyhey: true
          }
        },
        exchanges: [
          {
            name: 'exchange.one',
            type: 'topic',
            durable: true
          }, {
            name: 'exchange.one.dead',
            type: 'topic',
            durable: true
          }
        ]
      },

      a: {
        b: {
          c: {
            d: [1, 2, 3],
            dOverride: [1, 2, 3],
            dAliases: {
              $default: [1, 2, 3],
              $aliases: ['MY_AWESOME_ARRAY_ALIASE_D']
            },

            e: [true, false, true],
            eOverride: [false, true, false],
            eAliases: {
              $default: [true, false, true],
              $aliases: ['MY_AWESOME_ARRAY_ALIASE_E']
            },

            f: ['a', 'c', 'd'],
            fOverride: ['h', 'e', 'l', 'l', 'o'],
            fAliases: {
              $default: ['a', 'c', 'd'],
              $aliases: ['MY_AWESOME_ARRAY_ALIASE_F']
            },
          }
        }
      },

      c: {
        PORT: 8080,
        root: ''
      },

      MICROSTATS: {
        HASHKEY: 'B:mx:global'
      }
    });

    t.strictEqual(config.AMQP.LoGiN, 'plop');
    t.strictEqual(config.AMQP.PASSWORD, '');
    t.strictEqual(config.AMQP.PORT, 5672);
    t.strictEqual(config.AMQP.PLOP.ok.heyheyhey, true);
    t.strictEqual(config.AMQP.connect, true);
    t.strictEqual(config.AMQP.connect2, false);
    t.deepEqual(config.AMQP.exchanges, [
      {
        name: 'exchange.one',
        type: 'topic',
        durable: true
      }, {
        name: 'exchange.one.dead',
        type: 'topic',
        durable: true
      }
    ]);

    t.deepEqual(config.a.b.c.f, ['a', 'c', 'd']);
    t.deepEqual(config.a.b.c.fOverride, 'hello'.split(''));

    t.deepEqual(config.a.b.c.d, [1, 2, 3]);
    t.deepEqual(config.a.b.c.dOverride, [2, 3, 4]);
    t.deepEqual(config.a.b.c.dAliases, [5, 7, 8]);

    t.deepEqual(config.a.b.c.e, [true, false, true]);
    t.deepEqual(config.a.b.c.eOverride, [false, true, false]);

    t.strictEqual(config.c.root, '');
  });

  it('should return ask for ENV vars', function() {
    env.getOrElseAll({
      plop: {
        root_token: 'sdfopiqjsdfpoij',
        api: {
          endpoint_protocol: 'https',
          endpoint_host: 'sqdfqsdf.cleverapps.io',
          endpoint_port: ''
        },
        strategy: 'https://strategy.plop.net',
      }
    });

    t.ok(_.has(eventsFallback, 'PLOP_ROOT_TOKEN'), 'PLOP_ROOT_TOKEN');
    t.ok(_.has(eventsFallback, 'PLOP_API_ENDPOINT_PORT'), 'PLOP_API_ENDPOINT_PORT');
  });

  describe('ENV vars as array handling', () =>  {
    it('should handle array of plain objects', function() {
      process.env['ARRAYWITHOBJECT_API__0_A'] = 3;
      process.env['ARRAYWITHOBJECT_API__2_A'] = 1;

      var config = env.getOrElseAll({
        arrayWithObject: {
          api: [{
            a: 1
            }, {
            a: 2
            }]
        }
      });
      t.strictEqual(config.arrayWithObject.api[0].a, 3, 'config.arrayWithObject.api[0].a');
      t.strictEqual(config.arrayWithObject.api[1].a, 2, 'config.arrayWithObject.api[1].a');
      t.strictEqual(config.arrayWithObject.api[2].a, 1, 'config.arrayWithObject.api[2].a');

      t.ok(_.has(eventsFound, 'ARRAYWITHOBJECT_API__0_A'), 'ARRAYWITHOBJECT_API__0_A should have been found');
      t.ok(_.has(eventsFallback, 'ARRAYWITHOBJECT_API__1_A'), 'ARRAYWITHOBJECT_API__1_A should have NOT been found');
      t.ok(_.has(eventsFound, 'ARRAYWITHOBJECT_API__2_A'), 'ARRAYWITHOBJECT_API__2_A should have been found');
    });

    it('should handle an array of objects with description objects', function() {
      process.env['ARRAYWITHOBJECT_API__0_INT'] = 3;
      process.env['ARRAYWITHOBJECT_API__1_A'] = 2;
      process.env['ARRAYWITHOBJECT_API__2_INT'] = 1;

      var config = env.getOrElseAll({
        arrayWithObject: {
          api: [{
            int: {
              $default: 2,
              $type: env.types.Integer
            },
            a: 1
          }]
        }
      });

      if (!config.arrayWithObject.api[0].int) {
        // for debug only
        console.log(config.arrayWithObject.api);
      }
      t.strictEqual(config.arrayWithObject.api[0].int, 3, 'config.arrayWithObject.api[0].int');
      t.strictEqual(config.arrayWithObject.api[1].int, 2, 'config.arrayWithObject.api[1].int');
      t.strictEqual(config.arrayWithObject.api[1].a, 2, 'config.arrayWithObject.api[1].a');
      t.strictEqual(config.arrayWithObject.api[2].int, 1, 'config.arrayWithObject.api[2].int');
      t.ok(_.has(eventsFound, 'ARRAYWITHOBJECT_API__0_INT'), 'ARRAYWITHOBJECT_API__0_INT should have been found');
      t.ok(_.has(eventsFallback, 'ARRAYWITHOBJECT_API__1_INT'), 'ARRAYWITHOBJECT_API__1_INT should have NOT been found');
      t.ok(_.has(eventsFound, 'ARRAYWITHOBJECT_API__2_INT'), 'ARRAYWITHOBJECT_API__2_INT should have been found');
    });

    it('should throw an error handle array of description objects objects', function() {
      t.throws(() => {
        env.getOrElseAll({
          arrayWithObject: {
            api: [{
              $default: 2,
              $type: env.types.Integer
            }]
          }
        });
      }, 'CommonEnvRootConfigurationObjectException: ARRAYWITHOBJECT_API__0_');
    });
  });

  describe('$aliases handling', function() {
    it('should handle $default object value', function() {
      var config = env.getOrElseAll({
        a: {
          b: [{
            a: {
              $default: 'heyheyhey',
              $aliases: ['BLABLA_BLABLA', 'AMQP_LOGIN']
            }
          }, {
            a: {
              $default: 'plop2',
              $aliases: ['BLABLA_BLABLA'] // `BLABLA_BLABLA` does not exist, it should fallback on "plop"
            }
          }]
        },
        b: {
          $default: 10,
          $aliases: ['BLABLA_BLABLA', 'AMQP_GOOD_PORT', 'BLABLA_BLABLA']
        }
      });
      t.strictEqual(config.a.b[0].a, 'plop', 'should use AMQP_LOGIN value');
      t.ok(_.has(eventsFound, 'AMQP_LOGIN'), 'AMQP_LOGIN should be printed');

      t.strictEqual(config.b, 10);
      t.ok(_.has(eventsFound, 'AMQP_GOOD_PORT'), 'A_B[1]_A was defined should be printed');
    });

    it('should handle $default object value and fallback on default value', function() {
      var config = env.getOrElseAll({
        a: {
          b: [{
            a: {
              $default: 'plop2',
              $aliases: ['BLABLA_BLABLA'] // `BLABLA_BLABLA` does not exist, it should fallback on "plop"
            }
          }]
        }
      });
      t.strictEqual(config.a.b[0].a, 'plop2');
      t.ok(_.has(eventsFallback, 'A_B__0_A'), 'A_B__0_A was not defined should be printed');
    });

    describe('if $type was specified', function() {
      const env = envFactory();
      const tests = [
        {
          converter: env.types.Integer,
          val: '10',
          converted: 10
        }, {
          converter: env.types.Integer,
          val: '102039.23',
          converted: Error // because the value should be an integer
        }, {
          converter: env.types.Float,
          val: '10',
          converted: 10
        }, {
          converter: env.types.Float,
          val: '1.1',
          converted: 1.1
        }, {
          converter: env.types.Float,
          val: '102039.23',
          converted: 102039.23
        }, {
          converter: env.types.Float,
          val: 'aaa',
          converted: Error
        }, {
          converter: env.types.Boolean,
          val: 'true',
          converted: true
        }, {
          converter: env.types.Boolean,
          val: 'false',
          converted: false
        }, {
          converter: env.types.Boolean,
          val: 'TRUE',
          converted: true
        }, {
          converter: env.types.Boolean,
          val: 'oskdoskd',
          converted: Error
        }, {
          converter: env.types.String,
          val: 'string',
          converted: 'string'
        }, {
          converter: env.types.String,
          val: undefined,
          converted: Error
        }, {
          converter: env.types.Array(env.types.String),
          val: 'a,b,c,d',
          converted: ['a', 'b', 'c', 'd']
        }, {
          converter: env.types.Array(env.types.String),
          val: 'a',
          converted: ['a']
        }, {
          converter: env.types.Array(env.types.Integer),
          val: '1,2,3,4',
          converted: [1, 2, 3, 4]
        }, {
          converter: env.types.Array(env.types.Integer),
          val: '1',
          converted: [1]
        },{
          converter: env.types.Array(env.types.Integer),
          val: 'a,a',
          converted: Error
        }, {
          converter: env.types.Array(env.types.Float),
          val: '1,2.2,3,4.4',
          converted: [1, 2.2, 3, 4.4]
        }, {
          converter: env.types.Array(env.types.Float),
          val: '1.1',
          converted: [1.1]
        }, {
          converter: env.types.Array(env.types.Boolean),
          val: 'true,false,true,TRUE',
          converted: [true, false, true, true]
        }, {
          converter: env.types.Array(env.types.Boolean),
          val: 'true',
          converted: [true]
        }
      ].map(function(test) {
        return _.extend({}, {
          varName: (test.converter._name.toUpperCase() + '_' + test.val).replace('.', '_')
        }, test);
      });

      // ensure environment variables does not clash between them
      it('should have unique vairables names', function() {
        t.deepEqual(_.map(tests, 'varName'), _.chain(tests).map('varName').uniq().value());
      });

      beforeEach(function() {
        _.forEach(tests, function(v) {
          process.env[v.varName] = v.val;
        });
      });

      afterEach(function() {
        _.forEach(tests, function(v) {
          delete process.env[v.varName];
        });
      });

      _.forEach(tests, function(v) {
        describe('converter ' + v.converter._name + ' with value ' + JSON.stringify(v.val), function() {
          it('should be defined as a function', function() {
            t.ok(_.isFunction(v.converter), v.converter._name + ' should be a function');
          });

          if (v.converted === Error) {
            it('should throw an error when the converter ' + v.converter._name + ' does not receive a good value (e.g. with ' + v.val + ')', function() {

              t.throws(function() {
                env.getOrElseAll({
                  a: {
                    $type: v.converter,
                    $aliases: [v.varName]
                  }
                });
              });
            });
            return;
          }

          it('should handle ' + v.converter._name + ' converter as $type (e.g. with ' + JSON.stringify(v.val) + ')', function() {
            var config = env.getOrElseAll({
              a: {
                $type: v.converter,
                $aliases: [v.varName]
              }
            });

            t.deepEqual(config.a, v.converted);
          });

          it('should handle ' + v.converter._name + ' converter as $type (e.g. with ' + JSON.stringify(v.val) + ') whithout $aliases', function() {
            process.env.B = v.val;

            var config = env.getOrElseAll({
              b: {
                $type: v.converter
              }
            });

            delete process.env.B;

            t.deepEqual(config.b, v.converted);
          });
        });

      });


      it('throws an error if `itemConverter` was not a function', () => {
        t.throw(() => {
          env.getOrElseAll({
            a:{
              $type: env.types.Array('plop')
            }
          });
        });
      });
    });
  });

  describe('fail-fast behaviour', function() {
    it('should throw an error  $aliases was defined without nothing else', function() {
      t.throws(function() {
        env.getOrElseAll({
          thisIsA: {
            missing: [{
              sadVar: {
                $aliases: ['MISSING_VAR_' + (+new Date()), 'MISSING_VAR_2' + (+new Date())]
              }
            }]
          }
        });
      }, env.CommonEnvInvalidConfiguration);
    });

    it('should throw an error if aliases is not an array', function() {
      t.throws(function() {
        env.getOrElseAll({
          thisIsA: {
            missing: [{
              sadVar: {
                $default: 10,
                $aliases: null
              }
            }]
          }
        });
      }, Error);
    });

    it('should throw an error if $default is not defined and that no environment variables was specified', function() {
      t.throws(function() {
        env.getOrElseAll({
          thisIsA: {
            missing: [{
              sadVar: {
                $type: env.types.Float,
                $aliases: ['MISSING_VAR_' + (+new Date()), 'MISSING_VAR_2' + (+new Date())]
              }
            }]
          }
        });
      }, env.CommonEnvGetOrDieAliasesException);
    });
  });

  afterEach(function() {
    delete process.env.AMQP_LOGIN;
    delete process.env.AMQP_CONNECT;
    delete process.env.AMQP_CONNECT2;
    delete process.env.AMQP_GOOD_PORT;
    delete process.env['PLOP_API[0]_A'];
  });
});
