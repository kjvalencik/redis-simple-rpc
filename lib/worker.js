var Proxy = require('node-proxy'),
	redis = require('redis'),
	msgpack = require('msgpack'),
	_ = require('underscore'),
	createMessage, startWorker,
	Worker;

createMessage = function (req, args, isMore) {
	return msgpack.pack({
		i: req.i,
		a: args,
		m: isMore
	});
};

startWorker = function (namespace, obj, sender, receiver) {
	var pushPrefix = namespace + ':resp:',
		popPrefix = namespace + ':work',
		processRequest;

	processRequest = function () {
		receiver.blpop([popPrefix, 0], function (err, req) {
			var isMore = false,
				args, fn;

			process.nextTick(processRequest);
			if (err) {
				return console.error(err);
			}

			req = msgpack.unpack(req[1]);

			// Attempt to find the function
			fn = obj[req.f];
			if ("function" !== typeof fn) {
				return console.error({ err: "missing_method", message: "RPC method not found" });
			}

			args = req.a;
			args.push(function () {
				var args;

				// Not fire and forget
				if (req.c) {
					args = Array.prototype.slice.apply(arguments);
					sender.rpush([pushPrefix + req.c, createMessage(req, args, isMore)], function (err) {
						if (err) {
							return console.error(err);
						}
					});
				}

				isMore = false;
			});
			args.push(function (more) {
				isMore = undefined === more ? true : more;
			});

			fn.apply(fn, args);
		});
	};
	processRequest();
};

Worker = function (namespace, conn) {
	var obj = {},
		receiver, sender, reserved, proxy;

	conn = conn || {};
	conn.options = conn.options || {};
	conn.options.return_buffers = true;

	sender = redis.createClient(conn.port, conn.host, conn.options);
	receiver = redis.createClient(conn.port, conn.host, conn.options);

	// Reserved keys
	obj.end = function () {
		sender.end();
		receiver.end();
	};
	obj.clients = {
		sender: sender,
		receiver: receiver
	};
	reserved = _.keys(obj);

	// Start worker
	startWorker(namespace, obj, sender, receiver);

	proxy = Proxy.create({
		get: function (rcvr, field) {
			return obj[field];
		},
		set: function (rcvr, field, fn) {
			var receiver;

			if (_.contains(reserved, field)) {
				throw "Reserved key: " + field;
			}

			return obj[field] = fn;
		}
	});

	return proxy;
};

module.exports = Worker;