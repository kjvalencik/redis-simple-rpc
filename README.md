Redis Simple RPC
================

This is a very simple rpc client / server using Redis lists. It suports async
callbacks and streaming.

- It is not fault tolerant
- It is not production ready
- It probably works fine for simple cases

Travis CI Build Status
======================

[![Build Status](https://secure.travis-ci.org/kjvalencik/redis-simple-rpc.png?branch=master)](http://travis-ci.org/kjvalencik/redis-simple-rpc)

Usage
=====

Both the client and worker for node.js use proxy objects, making them as easy to
use as local functions.

Defining a worker:

	redisConnection = {
		host: '127.0.0.1',
		port: 1234
		options: {}
	};
	new Worker(namespace, redisConnection);

Example:

	var Worker = require('redis-simple-rpc').Worker,
		calc = new Worker('calc');

	calc.add = function (a, b, cb) {
		cb(null, a + b);
	};

Defining a client:

	new Client(namespace, clientId, redisConnection, timeout);

Example:

	var Client = require('redis-simple-rpc').Client,
		calc = new Client('calc');

	calc.add(1, 2, function (err, answer) {
		if (err) {
			throw err;
		}
		assert.equal(1 + 2, answer);
	});

Redis Errors
============

The node redis driver will throw an exception if a client does not have any listeners on `error`. Each client or worker has two redis clients.

	var Client = require('redis-simple-rpc').Client,
			calc = new Client('calc'),
			logError;

	logError = function () {
		return console.error.apply(console, arguments);
	};

	calc.clients.sender.on('error', logError);
	calc.clients.receiver.on('error', logError);



TODO
====

1. Add clients / workers for other languages
2. Use brpoplpush and Redis slaves for fault tolerance
3. Capacity awareness
