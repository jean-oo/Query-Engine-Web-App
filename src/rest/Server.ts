import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";
import fs from "fs-extra";


export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private insightFacade: InsightFacade = new InsightFacade();

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.registerMiddleware();
		// if (existsSync(".data/datasets.txt")) {
		// 	this.insightFacade.datasets = JSON.parse(fs.readFileSync(".data/datasets.txt").toString());
		// }
		this.registerRoutes();
		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}


	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// this.registerPutRoute();
		// this.registerDeleteRoute();
		this.express.put("/dataset/:id/:kind", this.PutRequest.bind(this));
		this.express.post("/query", this.PostRequest.bind(this));
		this.express.delete("/dataset/:id", this.DelRequest.bind(this));
		this.express.get("/datasets", this.GetRequest.bind(this));
		this.express.get("/echo/:msg", Server.echo);
	}

	private GetRequest(thisArg: any) {
		// console.log(thisArg);
		// this.express.get("/datasets", ((req, res) => {
		this.insightFacade.listDatasets().then((arr) => {
			// console.dir(arr);
			thisArg.res.status(200).json({result: arr});
		}).catch((err) => {
			thisArg.res.status(400).json({error: err.message});
		});
		// }));
	}

	private PostRequest(thisArg: any) {
		this.insightFacade.performQuery(thisArg.body)
			.then((arr) => {
				thisArg.res.status(200).json({result: arr});
			}).catch((err) => {
				thisArg.res.status(400).json({error: err.message});
			});
	}

	private DelRequest(thisArg: any) {
		// console.log("1");
		// console.log(thisArg.params.id);
		this.insightFacade.removeDataset(thisArg.params.id).then((dsid) => {
			thisArg.res.status(200).json({result:dsid});
		}).catch((error) => {
			if (error instanceof InsightError) {
				thisArg.res.status(400).json({error:error.message});
			} else if (error instanceof NotFoundError){
				thisArg.res.status(404).json({error:error.message});
			} else {
				thisArg.res?.status(400).json({error:error.message});
			}
		});
	}

	private PutRequest(thisArg: any) {
		let buffer = thisArg.body;
		this.insightFacade.addDataset(thisArg.params.id, buffer.toString("base64"), thisArg.params.kind)
			.then((arr) => {
				thisArg.res.status(200).json({result: arr});
			}).catch((err) => {
				thisArg.res.status(400).json({error: err.message});
			});
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
