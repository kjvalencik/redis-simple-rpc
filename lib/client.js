var Proxy = require('node-proxy'),
	redis = require('redis'),
	msgpack = require('msgpack'),
	_ = require('underscore'),
	createUID, createMessage,
	Client;

createUID = function () {
	var uid = "";
	while (uid.length < 8) {
	    uid += ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).substr(-4);
	}
	return uid;
};

createMessage = function (field, clientId, id, args) {
	var req = {
		a: args,
		f: field
	};
	if (id) {
		req.c = clientId;
		req.i = id;
	}
	return msgpack.pack(req);
};

Client = function (namespace, clientId, conn, timeout) {
	var self = this,
		popPrefix = namespace + ':resp:',
		obj = {},
		requests = {},
		processResp, sender, receiver, reserved, proxy;

	// Defaults
	clientId = clientId || createUID();
	conn = conn || {};
	conn.options = conn.options || {};
	conn.options.return_buffers = true;
	timeout = timeout || 1000;

	sender = redis.createClient(conn.port, conn.host, conn.options);
	receiver = redis.createClient(conn.port, conn.host, conn.options);

	// Reserved keys that do not get called remotely
	obj.end = function () {
		sender.end();
		receiver.end();
	};
	reserved = _.keys(obj);

	// Watch queue for responses
	processResp = function () {
		receiver.blpop([popPrefix + clientId, 0], function (err, resp) {
			var cb;

			process.nextTick(processResp);

			if (err) {
				return console.error(err);
			}

			resp = msgpack.unpack(resp[1]);
			req = requests[resp.i];

			if (req) {
				clearTimeout(req.timeoutHandle);

				if (resp.m) {
					req.timeoutHandle = setTimeout(req.timeoutFn, timeout);
				} else {
					delete requests[resp.i];
				}

				req.cb.apply(req.cb, resp.a);
			}
		});	
	};
	processResp();

	// Create a proxy object to pass back so that remote functions
	// can be used as if they were local
	proxy = Proxy.create({
		get: function (rcvr, field) {
			var data = obj[field];
			if (data) {
				return data;
			}

			data = function () {
				var args = Array.prototype.slice.call(arguments),
					pushPrefix = namespace + ':work',
					req = {},
					id;

				// Get callback and generate an id
				if ("function" === typeof args[args.length - 1]) {
					req.cb = args.pop();
					id = createUID();
				}

				// Make the request
				sender.rpush([pushPrefix, createMessage(field, clientId, id, args)], function (err) {
					if (err) {
						err = { err: "Connection error: ", message: err.toString() };
						console.error(err);
						if (req.cb) {
							cb(err);
							delete requests[id];
						}
					}
				});

				// Only keep track if this isn't fire and forget
				if (req.cb) {
					// Start a timeout
					req.timeoutFn = function () {
						req.cb({ err: "timeout", message: "A timeout waiting for " + field + "()" });
						delete requests[id];
					};
					req.timeoutHandle = setTimeout(req.timeoutFn, timeout);

					// Save this request for the return message
					requests[id] = req;
				}
			};

			return obj[field] = data;
		},
		set: function (rcvr, field, data) {
			if (_.contains(reserved, field)) {
				throw "Reserved key: " + field;
			}
			return obj[field] = data;
		}
	});

	return proxy
};

module.exports = Client;