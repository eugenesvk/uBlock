let ready = new Promise(r => {
	self.onmessage = e => {
		console.log("OFFSCREEN CONNECTED");
		r(e.data.port);
	}
});

chrome.offscreen.createDocument({ url: "/offscreen.html", reasons: ["WORKERS"], justification: "polyfilling workers" });

export let genuid = () => {
	return [...Array(16)].reduce(a => a + Math.random().toString(36)[2], '')
};

class Worker extends EventTarget {
	build(port, args) {
		let { port1, port2 } = new MessageChannel();
		port.postMessage({ type: "worker", args, port: port2, id: this.id, }, [port2]);

		this.port = port1;
		port1.onmessage = e => {
			if (this.onmessage)
				this.onmessage(e);
			this.dispatchEvent(new MessageEvent("message", { data: e.data }));
		};

		for (let x of this.backlog.splice(0, this.backlog.length)) {
			this.port.postMessage(...x);
		}
		port1.start();
	}

	backlog = [];
	id = genuid();

	constructor(...args) {
		super();

		if (ready instanceof Promise) {
			ready.then(port => {
				ready = port;
				this.build(port, args);
			});
		} else {
			this.build(ready, args);
		}
	}

	postMessage(...args) {
		if (this.port) {
			this.port.postMessage(...args);
		} else {
			this.backlog.push(args);
		}
	}

	terminate() {
		if (!this.port) throw new Error("guh");

		ready.postMessage({
			type: "workerKill",
			id: this.id
		})
	}
}
globalThis.Worker = Worker;
