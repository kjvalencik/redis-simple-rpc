var Worker = require('..').Worker,
	Calc;

Calc = new Worker('calc');

Calc.add = function (a, b, cb) {
	cb(null, a + b);
};
Calc.subtract = function (a, b, cb) {
	cb(null, a - b);
};
Calc.multiply = function (a, b, cb) {
	cb(null, a * b);
};
Calc.divide = function (a, b, cb) {
	if (b === 0) {
		return cb({ err: "zero_division", message: "Cannot divide by zero"});
	}
	cb(null, a / b);
};
Calc.fibStream = function (num, cb, setMore) {
	var a = 0,
		b = 1,
		c, i, isMore;

	for (i = 0; i < num; i += 1) {
		if (i < num - 1) {
			setMore();
		}
		if (i < 2) {
			cb(null, i);
		} else {
			c = a + b;
			cb(null, c);
			a = b;
			b = c;
		}
	}
};

module.exports = Calc;