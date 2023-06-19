"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const InsightFacade_1 = __importDefault(require("../controller/InsightFacade"));
const IInsightFacade_1 = require("../controller/IInsightFacade");
class Server {
    constructor(port) {
        this.insightFacade = new InsightFacade_1.default();
        console.info(`Server::<init>( ${port} )`);
        this.port = port;
        this.express = (0, express_1.default)();
        this.registerMiddleware();
        this.registerRoutes();
        this.express.use(express_1.default.static("./frontend/public"));
    }
    start() {
        return new Promise((resolve, reject) => {
            console.info("Server::start() - start");
            if (this.server !== undefined) {
                console.error("Server::start() - server already listening");
                reject();
            }
            else {
                this.server = this.express.listen(this.port, () => {
                    console.info(`Server::start() - server listening on port: ${this.port}`);
                    resolve();
                }).on("error", (err) => {
                    console.error(`Server::start() - server ERROR: ${err.message}`);
                    reject(err);
                });
            }
        });
    }
    stop() {
        console.info("Server::stop()");
        return new Promise((resolve, reject) => {
            if (this.server === undefined) {
                console.error("Server::stop() - ERROR: server not started");
                reject();
            }
            else {
                this.server.close(() => {
                    console.info("Server::stop() - server closed");
                    resolve();
                });
            }
        });
    }
    registerMiddleware() {
        this.express.use(express_1.default.json());
        this.express.use(express_1.default.raw({ type: "application/*", limit: "10mb" }));
        this.express.use((0, cors_1.default)());
    }
    registerRoutes() {
        this.express.put("/dataset/:id/:kind", this.PutRequest.bind(this));
        this.express.post("/query", this.PostRequest.bind(this));
        this.express.delete("/dataset/:id", this.DelRequest.bind(this));
        this.express.get("/datasets", this.GetRequest.bind(this));
        this.express.get("/echo/:msg", Server.echo);
    }
    GetRequest(thisArg) {
        this.insightFacade.listDatasets().then((arr) => {
            thisArg.res.status(200).json({ result: arr });
        }).catch((err) => {
            thisArg.res.status(400).json({ error: err.message });
        });
    }
    PostRequest(thisArg) {
        this.insightFacade.performQuery(thisArg.body)
            .then((arr) => {
            thisArg.res.status(200).json({ result: arr });
        }).catch((err) => {
            thisArg.res.status(400).json({ error: err.message });
        });
    }
    DelRequest(thisArg) {
        this.insightFacade.removeDataset(thisArg.params.id).then((dsid) => {
            thisArg.res.status(200).json({ result: dsid });
        }).catch((error) => {
            if (error instanceof IInsightFacade_1.InsightError) {
                thisArg.res.status(400).json({ error: error.message });
            }
            else if (error instanceof IInsightFacade_1.NotFoundError) {
                thisArg.res.status(404).json({ error: error.message });
            }
            else {
                thisArg.res?.status(400).json({ error: error.message });
            }
        });
    }
    PutRequest(thisArg) {
        let buffer = thisArg.body;
        this.insightFacade.addDataset(thisArg.params.id, buffer.toString("base64"), thisArg.params.kind)
            .then((arr) => {
            thisArg.res.status(200).json({ result: arr });
        }).catch((err) => {
            thisArg.res.status(400).json({ error: err.message });
        });
    }
    static echo(req, res) {
        try {
            console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
            const response = Server.performEcho(req.params.msg);
            res.status(200).json({ result: response });
        }
        catch (err) {
            res.status(400).json({ error: err });
        }
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map