import RetryOperation from './retry_operation.js';

export function operation(options) {
  var timeoutsArray = timeouts(options);
  return new RetryOperation(timeoutsArray, {
      forever: options && (options.forever || options.retries === Infinity),
      unref: options && options.unref,
      maxRetryTime: options && options.maxRetryTime
  });
}

export function timeouts(options) {
  if (options instanceof Array) {
    return [].concat(options);
  }

  var opts = {
    retries: 10,
    factor: 2,
    minTimeout: 1 * 1000,
    maxTimeout: Infinity,
    randomize: false
  };
  for (var key in options) {
    // Skip undefined values so that `{ retries: undefined }` does not clobber
    // the default (see #93).
    if (options[key] !== undefined) {
      opts[key] = options[key];
    }
  }

  if (opts.minTimeout > opts.maxTimeout) {
    throw new Error('minTimeout is greater than maxTimeout');
  }

  // `retries: Infinity` means retry forever. Building an Infinity-length array
  // would hang / run out of memory, so treat it as forever with no precomputed
  // timeouts (see #84).
  var forever = opts.forever || opts.retries === Infinity;
  var count = opts.retries === Infinity ? 0 : opts.retries;

  var timeoutsList = [];
  for (var i = 0; i < count; i++) {
    // Call createTimeout directly rather than via `this`, so named imports keep
    // working under bundlers that emit indirect calls, e.g. TypeScript 4.4+
    // `import { timeouts } from ...` (see #83).
    timeoutsList.push(createTimeout(i, opts));
  }

  if (forever && !timeoutsList.length) {
    timeoutsList.push(createTimeout(count, opts));
  }

  // sort the array numerically ascending
  timeoutsList.sort(function(a, b) {
    return a - b;
  });

  return timeoutsList;
}

export function createTimeout(attempt, opts) {
  var random = (opts.randomize)
    ? (Math.random() + 1)
    : 1;

  var timeout = Math.round(random * Math.max(opts.minTimeout, 1) * Math.pow(opts.factor, attempt));
  timeout = Math.min(timeout, opts.maxTimeout);

  return timeout;
}

export function wrap(obj, options, methods) {
  if (options instanceof Array) {
    methods = options;
    options = null;
  }

  if (!methods) {
    methods = [];
    for (var key in obj) {
      if (typeof obj[key] === 'function') {
        methods.push(key);
      }
    }
  }

  for (var i = 0; i < methods.length; i++) {
    var method   = methods[i];
    var original = obj[method];

    obj[method] = function retryWrapper(original) {
      var op       = operation(options);
      var args     = Array.prototype.slice.call(arguments, 1);
      var callback = args.pop();

      args.push(function(err) {
        if (op.retry(err)) {
          return;
        }
        if (err) {
          arguments[0] = op.mainError();
        }
        callback.apply(this, arguments);
      });

      op.attempt(function() {
        original.apply(obj, args);
      });
    }.bind(obj, original);
    obj[method].options = options;
  }
}
