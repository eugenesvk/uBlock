let sw = (await navigator.serviceWorker.ready).active;
let { port1: port, port2 } = new MessageChannel();
sw.postMessage({ port: port2 }, [port2]);

let workerMap = new Map();

port.onmessage = e => {
	if (e.data.type === "worker") {
		let port = e.data.port;
		let worker = new Worker(...e.data.args);
		worker.onmessage = e => { port.postMessage(e.data) };
		port.onmessage = e => { worker.postMessage(e.data) };
		console.log("WORKER READY", e.data.id);
		port.start();

		workerMap.set(e.data.id, worker);
	} else if (e.data.type === "workerKill") {
		workerMap.get(e.data.id).terminate();
		workerMap.delete(e.data.id);
		console.log("WORKER DEAD", e.data.id);
	}
};
port.start();
