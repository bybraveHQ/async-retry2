export default function RetryOperation(timeouts, options) {
  // Compatibility for the old (timeouts, retryForever) signature
  if (typeof options === 'boolean') {
    options = { forever: options };
  }

  this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
  this._timeouts = timeouts;
  this._options = options || {};
  this._maxRetryTime = (options && options.maxRetryTime) || Infinity;
  this._fn = null;
  this._errors = [];
  this._attempts = 1;
  this._operationTimeout = null;
  this._operationTimeoutCb = null;
  this._timeout = null;
  this._operationStart = null;
  this._timer = null;
  this._lastTimeout = null;

  if (this._options.forever) {
    this._cachedTimeouts = this._timeouts.slice(0);
  }
}

RetryOperation.prototype.reset = function() {
  this._attempts = 1;
  this._timeouts = this._originalTimeouts.slice(0);
  // Also clear accumulated errors so a reused operation does not keep growing
  // its error list (see #65).
  this._errors = [];
};

RetryOperation.prototype.stop = function() {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }
  if (this._timer) {
    clearTimeout(this._timer);
  }

  this._timeouts       = [];
  this._cachedTimeouts = null;
};

RetryOperation.prototype.retry = function(err) {
  if (this._timeout) {
    clearTimeout(this._timeout);
  }

  if (!err) {
    return false;
  }
  var currentTime = new Date().getTime();
  if (err && currentTime - this._operationStart >= this._maxRetryTime) {
    this._errors.push(err);
    this._errors.unshift(new Error('RetryOperation timeout occurred'));
    return false;
  }

  this._errors.push(err);

  var timeout = this._timeouts.shift();
  if (timeout === undefined) {
    if (this._cachedTimeouts) {
      // retry forever, only keep last error
      this._errors.splice(0, this._errors.length - 1);
      timeout = this._cachedTimeouts.slice(-1);
    } else {
      return false;
    }
  }

  // Expose the delay (ms) before the next attempt so callers can log it, e.g.
  // "will retry in 16 seconds" (see #73). `getTimeout()` reads this.
  this._lastTimeout = Array.isArray(timeout) ? timeout[0] : timeout;

  var self = this;
  this._timer = setTimeout(function() {
    self._attempts++;

    if (self._operationTimeoutCb) {
      self._timeout = setTimeout(function() {
        self._operationTimeoutCb(self._attempts);
      }, self._operationTimeout);

      if (self._options.unref) {
          self._timeout.unref();
      }
    }

    self._fn(self._attempts);
  }, timeout);

  if (this._options.unref) {
      this._timer.unref();
  }

  return true;
};

RetryOperation.prototype.attempt = function(fn, timeoutOps) {
  this._fn = fn;

  if (timeoutOps) {
    if (timeoutOps.timeout) {
      this._operationTimeout = timeoutOps.timeout;
    }
    if (timeoutOps.cb) {
      this._operationTimeoutCb = timeoutOps.cb;
    }
  }

  var self = this;
  if (this._operationTimeoutCb) {
    this._timeout = setTimeout(function() {
      self._operationTimeoutCb();
    }, self._operationTimeout);
  }

  this._operationStart = new Date().getTime();

  this._fn(this._attempts);
};

RetryOperation.prototype.try = function(fn) {
  console.log('Using RetryOperation.try() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = function(fn) {
  console.log('Using RetryOperation.start() is deprecated');
  this.attempt(fn);
};

RetryOperation.prototype.start = RetryOperation.prototype.try;

RetryOperation.prototype.errors = function() {
  return this._errors;
};

RetryOperation.prototype.attempts = function() {
  return this._attempts;
};

// Delay in milliseconds before the next scheduled attempt, or null if none has
// been scheduled yet (see #73).
RetryOperation.prototype.getTimeout = function() {
  return this._lastTimeout;
};

RetryOperation.prototype.mainError = function() {
  if (this._errors.length === 0) {
    return null;
  }

  var counts = {};
  var mainError = null;
  var mainErrorCount = 0;

  for (var i = 0; i < this._errors.length; i++) {
    var error = this._errors[i];
    var message = error.message;
    var count = (counts[message] || 0) + 1;

    counts[message] = count;

    if (count >= mainErrorCount) {
      mainError = error;
      mainErrorCount = count;
    }
  }

  return mainError;
};
