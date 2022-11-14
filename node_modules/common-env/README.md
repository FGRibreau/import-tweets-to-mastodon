
<div align="center">
  <img src="https://cdn.rawgit.com/egoist/fa2efce43aa2f62e39bbc363bf2240b7/raw/c17a8a5bf5981c32d7b38bbf2dcd88866ef1c8b1/gear.svg" alt="">
  <br><p><strong>common-env</strong> configuration through <a href="http://blog.honeybadger.io/ruby-guide-environment-variables">environment variables</a> finally done right.</p>
</div>

[![Build Status](https://img.shields.io/circleci/project/github/FGRibreau/common-env.svg)](https://circleci.com/gh/FGRibreau/common-env/) [![Coverage Status](https://img.shields.io/coveralls/FGRibreau/common-env/master.svg)](https://coveralls.io/github/FGRibreau/common-env?branch=master) [![Deps](	https://img.shields.io/david/FGRibreau/common-env.svg)](https://david-dm.org/FGRibreau/common-env) [![NPM version](https://img.shields.io/npm/v/common-env.svg)](http://badge.fury.io/js/common-env) [![Downloads](http://img.shields.io/npm/dm/common-env.svg)](https://www.npmjs.com/package/common-env) 

[![Get help on Codementor](https://cdn.codementor.io/badges/get_help_github.svg)](https://www.codementor.io/francois-guillaume-ribreau?utm_source=github&utm_medium=button&utm_term=francois-guillaume-ribreau&utm_campaign=github) [![available-for-advisory](https://img.shields.io/badge/available%20for%20consulting%20advisory-yes-ff69b4.svg?)](http://bit.ly/2c7uFJq) ![extra](https://img.shields.io/badge/actively%20maintained-yes-ff69b4.svg)

# Philosophy

Here is my principle:

[![uslide_52](https://cloud.githubusercontent.com/assets/138050/8478738/8eba09f0-20d3-11e5-9fa7-43d952bacb99.png)](https://www.uslide.io/presentations/Aw6sX5ug-Tfzw5rNXAmdJg)

[See the talk (in french) about the why [15:23-21:30]](https://www.uslide.io/presentations/Aw6sX5ug-Tfzw5rNXAmdJg)

\* besides i18n translation key and things like that of course (well, now that we've got symbols in ES6...)

# NPM

```shell
npm install common-env
```

#### Usage

```javascript
var env = require('common-env')();
var config = env.getOrElseAll({
  amqp: {
    login: {
      $default: 'guest',
      $aliases: ['ADDON_RABBITMQ_LOGIN', 'LOCAL_RABBITMQ_LOGIN']
    },
    password: 'guest',
    host: 'localhost',
    port: 5672
  }
});

t.strictEqual(config.amqp.login, 'plop'); // converted from env
```


#### env.getOrDie(envVarName)

#### env.getOrElse(envVarName, default)

#### env.getOrElseAll(object)

`getOrElseAll` allows you to specify a configuration object with default values that will be resolved from environment variables.

Let say we start a script with `AMQP_LOGIN=plop AMQP_CONNECT=true AMQP_EXCHANGES[0]_NAME=new_exchange FACEBOOK_SCOPE="user,timeline" FACEBOOK_BACKOFF="200,800" node test.js` with `test.js` defined as follow:

```javascript
var env = require('common-env')();

var config = env.getOrElseAll({
  amqp: {
    login: 'guest',
    password: 'guest',
    host: 'localhost',
    port: 5672,
    connect: false,
    exchanges:[{
      name: 'first_exchange'
    },{
      name: 'second_exchange'
    }]
  },

  FULL_UPPER_CASE: {
    PORT: 8080
  },

  facebook:{
    scope:['user', 'timeline', 'whatelse'],
    backOff: [200, 500, 700]
  },

  MICROSTATS: {
    HASHKEY: 'B:mx:global'
  }
});

t.strictEqual(config.amqp.login, 'plop'); // extracted and converted from env
t.strictEqual(config.amqp.port, 5672);
t.strictEqual(config.amqp.connect, true); // extracted and converted from env
t.strictEqual(config.amqp.exchanges[0].name, 'new_exchange'); // extracted from env
t.strictEqual(config.FULL_UPPER_CASE.PORT, 8080);
t.strictEqual(config.facebook.scope, ['user', 'timeline']); // extracted and converted from env
t.strictEqual(config.facebook.backoff, [200, 800]); // extracted and converted from env
```

#### Events

Common-env will emit the following events:

- `env:fallback(key, $default)`: each time a environment key was not found and that common-env fallback on `$default`.
- `env:found(key, value, $default)`

```javascript
// let say NODE_ENV was set to "production"

var env = require('common-env')();

var config = env
      .on('env:found', function (fullKeyName, value, $secure) {
        value = $secure ? '***' : value;
        console.log('[env] %s was defined, using: %s', fullKeyName, String(value));
      })
      .on('env:fallback', function (fullKeyName, $default, $secure) {
        $default = $secure ? '***' : $default;
        console.log('[env] %s was not defined, using default: %s', fullKeyName, String($default));
      })
      .getOrElseAll({
        node: {
          env: 'production'
        },
        redsmin: {
          gc: {
            enabled: false
          }
        }
      });

// Will print

// [env] NODE_ENV was defined, using: production
// [env] REDSMIN_GC_ENABLED was not defined, using default: false
```

#### Specifying multiple aliases

It's sometimes useful to be able to specify aliases, for instance [Clever-cloud](http://clever-cloud.com) or [Heroku](https://heroku.com) expose their own environment variable names while your application's internal code may not want to rely on them. You may not want to depend on your hosting provider conventions.

Common-env adds a [layer of indirection](http://en.wikipedia.org/wiki/Fundamental_theorem_of_software_engineering) enabling you to specify environment aliases that won't impact your codebase.

#### How to handle environment variable arrays

Since **v6**, common-env is able to read arrays from environment variables. Before going further, please don't forget that **environment variables do not support arrays**, thus `MY_ENV_VAR[0]_A` is not a valid environment variable name, as well as `MY_ENV_VAR$0$_A` and so on. In fact, the only supported characters are `[0-9_]`. But since we wanted **a lot** array support [we had to find a work-around](https://github.com/FGRibreau/common-env/issues/6).

And here is what we did:

| Configuration key path | Generated environment key |
|---|---|
| amqp.exchanges[0].name | AMQP_EXCHANGES__0_NAME |
| amqp.exchanges[10].name | AMQP_EXCHANGES__10_NAME |

As you can see, we a replacing `[0]`, with `__0` and thus common-env is compliant with the limited character support while providing an awesome abstraction for configuration through environment variables.

Note that **only the first element** of the array will be used as a **description** for every other element of the array. So in the following code:

```js
const config = env.getOrElseAll({
  mysql: {
    hosts: [{
      host: '127.0.0.1',
      port: 3306
      }, {
      auth: {
        $type: env.types.String
        $secure: true
      }
    }]
  }
});
```

only the first object

`{
  host: '127.0.0.1',
  port: 3306
}`

will be used as a *type* template for every defined elements.

One last thing, common-env is smart enough to build plain arrays (not sparse), so if you defined `MYSQL_HOSTS__10_PORT=3310`, `config.mysql.hosts` will contains **10 objects** as you thought it would.

#### How to specify environment variable arrays

Common-env is able to use arrays as key values for instance:

```javascript
// test.js
var env = require('common-env')();
var config = env.getOrElse({
  amqp:{
    hosts:['192.168.1.1', '192.168.1.2']
  }
});

console.log(config.amqp.hosts);
```

Running the above script we can override `amqp.hosts` values with the `AMQP_HOSTS` environment variable we get:

```shell
$ node test.js
['192.168.1.1', '192.168.1.2']
$ AMQP_HOSTS='127.0.0.1' node test.js
['127.0.0.1']
$ AMQP_HOSTS='88.23.21.21,88.23.21.22,88.23.21.23' node test.js
['88.23.21.21', '88.23.21.22', '88.23.21.23']
```

#### How to specify environment variable arrays using $aliases

**Deprecated** aliases breaks common-env philosophy by allowing a developer to specify environment variables that matches outside constraints (like a company convention). Since a software internal configuration should not depends on external factors, this feature is now deprecated.

```javascript
// test.js
var env = require('common-env')();
var config = env.getOrElse({
  amqp:{
    hosts:{
      $default: ['192.168.1.1', '192.168.1.2'],
      $aliases: ['ADDON_RABBITMQ_HOSTS', 'LOCAL_RABBITMQ_HOSTS']
    }
  }
});

console.log(config.amqp.hosts);
```

Running the above script we can override `amqp.hosts` values with the `ADDON_RABBITMQ_HOSTS` or `LOCAL_RABBITMQ_HOSTS` environment variable aliases we get:

```shell
$ node test.js
['192.168.1.1', '192.168.1.2']
$ ADDON_RABBITMQ_HOSTS='127.0.0.1' node test.js
['127.0.0.1']
$ LOCAL_RABBITMQ_HOSTS='88.23.21.21,88.23.21.22,88.23.21.23' node test.js
['88.23.21.21', '88.23.21.22', '88.23.21.23']
```

Aliases don't supports arrays in their names and never will. **$aliases is deprecated**, please use common-env classical form.


##### fail-fast behaviour

If `$default` is not defined and no environment variables (aliases included) resolve to a value then common-env will throw an error. This error should not be caught in order to make the app crash, following the [fail-fast](https://en.wikipedia.org/wiki/Fail-fast) principle.

### How to define type converters

Since common-env uses `$default` to infer the environment variable type, if `$default` is not available common-env won't be able to use the right type, for instance:

```js
// ...
var config = env.getOrElseAll({
 redis:{
   hosts: {
      $aliases: ['REDIS_ADDON_PORTS']
   }
 }
});
```

`config.redis.ports` should be **an array of number** but instead common-env will fallback to a string because it can't infer what should be the type of `config.redis.ports`. That's where `$type` is handy if gives you a way to tell common-env how it should convert the value:

```js
// ...
var config = env.getOrElseAll({
 redis:{
   hosts: {
      $aliases: ['REDIS_ADDON_PORTS'],
      $type: env.types.Array(env.types.Number)
   }
 }
```

*Note that `$aliases` isn't mandatory with `$type`.*

As of today, currently supported types are:

- `env.types.String`
- `env.types.Integer`
- `env.types.Float`
- `env.types.Boolean`
- `env.types.Array(env.types.String)`
- `env.types.Array(env.types.Integer)`
- `env.types.Array(env.types.Float)`
- `env.types.Array(env.types.Boolean)`


#### How common-env resolves environment variables

Let's take the following configuration object:

```javascript
{
  amqp: {
    login: {
      $default: 'guest',
      $aliases: ['ADDON_RABBITMQ_LOGIN', 'LOCAL_RABBITMQ_LOGIN']
    },
    password: 'guest',
    host: 'localhost',
    port: 5672
  }
}
```

Here is how common-env will resolve `amqp.login`:

- Common-env will first read `ADDON_RABBITMQ_LOGIN` environment variable, if it exists, its value will be used.
- If not common-env will read `LOCAL_RABBITMQ_LOGIN`, if it exists, its value will be used.
- If not common-env will read `AMQP_LOGIN`, if it exists, its value will be used.
- If not common-env will fallback on `$default` value.

<p align="center">
<img style="width:100%" src="./docs/Thumbs-Up-Gif.gif"/>
</p>


#### How to retrieve old common-env logging behaviour

Common-env 1.x.x-2.x.x was displaying logs, here is how to retrieve the same behaviour in 3.x.x.

```javascript
var logger = console;
var config = require('common-env/withLogger')(logger).getOrElseAll({
  amqp: {
    login: {
      $default: 'guest',
      $aliases: ['ADDON_RABBITMQ_LOGIN', 'LOCAL_RABBITMQ_LOGIN']
    },
    password: 'guest',
    host: 'localhost',
    port: 5672
  }
});

```

#### How to set silent (or secure) values in output logger

```javascript
var logger = console;
var config = require('common-env/withLogger')(logger).getOrElseAll({
  amqp: {
    password: {
      $default: 'guest',
      $secure: true
    }
  }
});

// Console output:
// [env] AMQP_PASSWORD was not defined, using default: ***"
// [env] AMQP_PASSWORD was defined, using: ***"
```

#### [Changelog](/CHANGELOG.md)

## Donate

I maintain this project in my free time, if it helped you please support my work [via paypal](https://paypal.me/fgribreau) or [Bitcoins](https://www.coinbase.com/fgribreau), thanks a lot!
