'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Progress = require('progress');

var ProgressBar = function (_require$EventEmitter) {
	_inherits(ProgressBar, _require$EventEmitter);

	_createClass(ProgressBar, null, [{
		key: 'create',
		value: function create() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			return new (Function.prototype.bind.apply(this, [null].concat(args)))();
		}
	}]);

	function ProgressBar() {
		var _ref;

		_classCallCheck(this, ProgressBar);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		var _this = _possibleConstructorReturn(this, (_ref = ProgressBar.__proto__ || Object.getPrototypeOf(ProgressBar)).call.apply(_ref, [this].concat(args)));

		_this._tick = null;
		_this._total = null;
		_this._bar = null;
		_this._step = null;
		_this._domain = null;

		_this.start();
		return _this;
	}

	_createClass(ProgressBar, [{
		key: 'start',
		value: function start() {
			var me = this;
			this._tick = 0;
			this._total = 1;
			try {
				this._domain = require('domain').create();
			} catch (err) {}

			// bubble domain errors
			if (this._domain) {
				this._domain.on('error', function (err) {
					me.emit('error', err);
				});
			}

			// destroy the old progressbar and create our new one
			this.on('step', function () {
				me.destroy();
				var message = 'Performing ' + me._step + ' at :current/:total :percent :bar';
				if (me._domain) {
					me._domain.run(me.onStep.bind(me, message));
				} else {
					me.onStep();
				}
			});

			// update our bar's total
			this.on('total', function () {
				if (me._bar) me._bar.total = me._total;
			});

			// update our bar's progress
			this.on('tick', function () {
				if (me._bar) me._bar.tick(me._tick - me._bar.curr);
			});

			// chain
			return this;
		}
	}, {
		key: 'onStep',
		value: function onStep(message) {
			try {
				this._bar = new Progress(message, {
					width: 50,
					total: this._total,
					clear: true
				});
			} catch (err) {
				if (this._domain) {
					this._domain.emit('error', err);
				} else {
					this.emit('error', err);
				}
			}
		}
	}, {
		key: 'step',
		value: function step(s) {
			if (s != null) {
				this.setStep(s);
			} else {
				throw new Error('step is now just an alias for setStep to ensure consistent return value');
			}
			return this;
		}
	}, {
		key: 'getStep',
		value: function getStep() {
			return this._step;
		}
	}, {
		key: 'setStep',
		value: function setStep(s) {
			if (!s) throw new Error('no step param defined');
			this._step = s;
			this.emit('step', this._step);
			this.setTick(0);
			this.setTotal(1);
			return this;
		}
	}, {
		key: 'total',
		value: function total(t) {
			if (t != null) {
				this.setTotal(t);
			} else {
				this.addTotal();
			}
			return this;
		}
	}, {
		key: 'getTotal',
		value: function getTotal() {
			return this._total;
		}
	}, {
		key: 'addTotal',
		value: function addTotal() {
			var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

			this._total += t;
			this.emit('total', this._total);
			return this;
		}
	}, {
		key: 'setTotal',
		value: function setTotal(t) {
			this._total = t || 1; // must be truthy rather than null, otherwise: RangeError: Invalid array length
			this.emit('total', this._total);
			return this;
		}
	}, {
		key: 'tick',
		value: function tick(t) {
			if (t != null) {
				this.setTick(t);
			} else {
				this.addTick();
			}
			return this;
		}
	}, {
		key: 'getTick',
		value: function getTick() {
			return this._tick;
		}
	}, {
		key: 'addTick',
		value: function addTick() {
			var t = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

			this._tick += t;
			this.emit('tick', this._tick);
			return this;
		}
	}, {
		key: 'setTick',
		value: function setTick(t) {
			this._tick = t;
			this.emit('tick', this._tick);
			return this;
		}
	}, {
		key: 'destroy',
		value: function destroy(next) {
			if (this._bar != null) {
				var me = this;
				if (this._domain) {
					this._domain.run(function () {
						me._bar.terminate();
					});
					this._domain.run(function () {
						me._bar = null;
					});
				} else {
					me._bar.terminate();
					me._bar = null;
				}
			}
			if (next) next();
			return this;
		}
	}, {
		key: 'finish',
		value: function finish(next) {
			var me = this;
			this.destroy(function () {
				me.emit('finish');
				if (me._domain) me._domain.exit();
				me.removeAllListeners();
				if (next) next();
			});
			return this;
		}
	}]);

	return ProgressBar;
}(require('events').EventEmitter);

// Export


module.exports = ProgressBar;

// Backwards API Compat
module.exports.ProgressBar = ProgressBar;