var async = require('async'),
	assert = require('assert'),
	Client = require('..').Client,
	worker = require('./calc');

var calc = new Client('calc', 'test'),
	cmds = [],
	num = 10,
	i;

for (i = 0; i < num; i++) {
	cmds.push(function (cb) {
		var a = Math.random(),
			b = Math.random();

		calc.add(a, b, function (err, c) {
			cb(err || a + b - c);
		});
	});
}

for (i = 0; i < num; i++) {
	cmds.push(function (cb) {
		var a = Math.random(),
			b = Math.random();

		calc.subtract(a, b, function (err, c) {
			cb(err || a - b - c);
		});
	});
}

for (i = 0; i < num; i++) {
	cmds.push(function (cb) {
		var a = Math.random(),
			b = Math.random();

		calc.multiply(a, b, function (err, c) {
			cb(err || a * b - c);
		});
	});
}

for (i = 0; i < num; i++) {
	cmds.push(function (cb) {
		var a = Math.random(),
			b = Math.random() + 1;

		calc.divide(a, b, function (err, c) {
			cb(err || a / b - c);
		});
	});
}

var start = new Date(),
	isSuccess = true;

async.parallel(cmds, function (err) {
	var end = new Date();
	if (err) {
		isSuccess = false;
	} else {
		console.log(cmds.length + " operations in " + (end - start) + " ms.");
	}

	// Try an error
	calc.divide(1, 0, function (err) {
		var fib;

		console.log("Excpected illegal: " + err.message);
		if (!err) {
			isSuccess = false;
		}

		// Try streaming
		fib = [0,1,1,2,3,5,8,13,21,34];
		calc.fibStream(10, function (err, num) {
			if (err || fib.shift() !== num) {
				isSuccess = false;
			}
			if (!fib.length) {
				// Try a timeout
				worker.end();
				calc.add(1, 1, function (err) {
					isSuccess = err && isSuccess;

					console.log("Excpected timeout: " + err.message);
					if (!isSuccess) {
						console.log('FAIL!');
					} else {
						console.log('SUCCESS!');
					}
		
					calc.end();

					// TODO: Clean up this test file with proper asserts.
					assert(isSuccess);
				});
			}
		});
	})
});
