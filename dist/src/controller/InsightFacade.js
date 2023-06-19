"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const addCourseDS_1 = require("./addCourseDS");
const addRoomDS_1 = require("./addRoomDS");
const fs = __importStar(require("fs-extra"));
const tools_1 = require("./tools");
const path = "./data";
const JSZip = require("jszip");
const doQuery_1 = require("./doQuery");
const queryTransformation_1 = require("./queryTransformation");
class InsightFacade {
    constructor() {
        this.datasets = [];
        this.dataset_ids = [];
        this.courseMap = new Map();
        this.roomMap = new Map();
        this.result = [];
        this.listGetWhere = [];
        this.tempFieldID = "";
        this.courseAllField = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
        this.courseStringField = ["dept", "id", "instructor", "title", "uuid"];
        this.courseNumericalField = ["avg", "pass", "fail", "audit", "year"];
        this.roomAllField = ["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture",
            "href"];
        this.roomStringField = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
        this.roomNumericalField = ["lat", "lon", "seats"];
        this.updateGlobal();
    }
    addDataset(id, content, kind) {
        let objects = [];
        return new Promise((resolve, reject) => {
            if (id.includes("_") || (0, tools_1.isSpace)(id)) {
                return reject(new IInsightFacade_1.InsightError("id is invalid"));
            }
            if (this.dataset_ids.includes(id)) {
                return reject(new IInsightFacade_1.InsightError("dataset already existed"));
            }
            return new JSZip().loadAsync(content, { base64: true }).then((courseFiles) => {
                if (kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                    return (0, addCourseDS_1.addCoursesDataset)(courseFiles, objects, id, resolve, reject, this.courseMap, this.datasets, this.dataset_ids, this.roomMap);
                }
                else {
                    return (0, addRoomDS_1.addRoomsDataset)(courseFiles, objects, id, resolve, reject, content, this.courseMap, this.datasets, this.dataset_ids, this.roomMap);
                }
            }).catch(() => {
                return reject(new IInsightFacade_1.InsightError("zip file error"));
            });
        });
    }
    listDatasets() {
        return new Promise((resolve) => {
            return resolve(this.datasets);
        });
    }
    performQuery(query) {
        if (query === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError("query is null"));
        }
        let queryO = query;
        let queryKeys = Object.keys(queryO);
        if (queryKeys.length === 3 && queryKeys[2] !== "TRANSFORMATIONS") {
            return Promise.reject(new IInsightFacade_1.InsightError("invalid query,wrong in TRANSFORMATIONS"));
        }
        if (queryKeys.length < 2 || queryKeys.length > 3 || queryKeys[0] !== "WHERE" || queryKeys[1] !== "OPTIONS" ||
            !queryO.WHERE || !queryO.OPTIONS) {
            return Promise.reject(new IInsightFacade_1.InsightError("invalid query, no WHERE or no OPTIONS"));
        }
        let optionsThing = queryO.OPTIONS;
        let selectedSets = [];
        let type;
        let allField = this.courseAllField;
        let stringFiled = this.courseStringField;
        let numericalFiled = this.courseNumericalField;
        let map = this.courseMap;
        if (!this.getType(queryO)) {
            return Promise.reject(new IInsightFacade_1.InsightError("400"));
        }
        for (let s of this.datasets) {
            if (s.id === this.tempFieldID) {
                type = s.kind;
                break;
            }
        }
        if ("rooms" === type) {
            allField = this.roomAllField;
            stringFiled = this.roomStringField;
            numericalFiled = this.roomNumericalField;
            map = this.roomMap;
        }
        return this.getQuery(queryO, queryO.WHERE, selectedSets, allField, stringFiled, numericalFiled, map, optionsThing);
    }
    getType(queryO) {
        if (queryO.TRANSFORMATIONS) {
            if (Object.keys(queryO.TRANSFORMATIONS)[1] !== "APPLY") {
                return false;
            }
            if (queryO.TRANSFORMATIONS.APPLY && Object.keys(queryO.TRANSFORMATIONS.APPLY).length !== 0) {
                if (!(queryO.TRANSFORMATIONS.APPLY)[0] || typeof queryO.TRANSFORMATIONS.APPLY[0] !== "object") {
                    return false;
                }
                let applyRuleEntire = Object.values((queryO.TRANSFORMATIONS.APPLY)[0]);
                let temp;
                temp = Object.values(applyRuleEntire)[0];
                if (!temp) {
                    return false;
                }
                temp = Object.values(temp)[0];
                this.tempFieldID = temp.split("_")[0];
            }
        }
        if (Object.keys(queryO.OPTIONS)[0] !== "COLUMNS") {
            return false;
        }
        for (let o of queryO.OPTIONS.COLUMNS) {
            if (typeof o !== "string" || o === null || o === undefined) {
                return false;
            }
            if (o.includes("_")) {
                this.tempFieldID = o.split("_")[0];
                break;
            }
        }
        return true;
    }
    async getQuery(queryO, whereFilter, selectedSets, allField, stringFiled, numericalFiled, map, optionsThing) {
        try {
            const res = await (0, doQuery_1.checkWhere)(whereFilter, this.dataset_ids, this.tempFieldID, allField, stringFiled, numericalFiled);
            this.tempFieldID = res;
        }
        catch (e) {
            return Promise.reject(e);
        }
        let anykey = [];
        if (queryO.TRANSFORMATIONS) {
            if ((0, queryTransformation_1.checkTrans)(queryO, this.courseAllField, this.dataset_ids, stringFiled) === []) {
                return Promise.reject(new IInsightFacade_1.InsightError("invalid query, wrong TRANSFORMATIONS"));
            }
            anykey = (0, queryTransformation_1.checkTrans)(queryO, allField, this.dataset_ids, stringFiled);
        }
        try {
            await (0, doQuery_1.checkOpt)(queryO, allField, this.dataset_ids, anykey);
        }
        catch (e1) {
            return Promise.reject(e1);
        }
        const mapValue = map.get(this.tempFieldID);
        if (mapValue !== undefined) {
            let c = 0;
            for (let val of mapValue) {
                if ((0, doQuery_1.getWhere)(whereFilter, val, c)) {
                    selectedSets.push(val);
                }
            }
        }
        if (queryO.TRANSFORMATIONS) {
            let res = await (0, queryTransformation_1.getTrans)(selectedSets, queryO);
            selectedSets = res;
        }
        try {
            const res2 = await (0, doQuery_1.getOpt)(optionsThing, selectedSets, numericalFiled, stringFiled);
            return Promise.resolve(res2);
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    removeDataset(id) {
        return new Promise((resolve, reject) => {
            console.log("remover1");
            if (id.includes("_") || id === " " || (0, tools_1.isSpace)(id)) {
                return reject(new IInsightFacade_1.InsightError("id is invalid"));
            }
            if (!this.dataset_ids.includes(id)) {
                return reject(new IInsightFacade_1.NotFoundError("There is no such dataset"));
            }
            this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
            this.dataset_ids = this.dataset_ids.filter((eachID) => eachID !== id);
            if (this.courseMap.has(id)) {
                this.courseMap.delete(id);
            }
            else {
                this.roomMap.delete(id);
            }
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
            fs.writeFileSync(path + "/datasets.txt", JSON.stringify(this.datasets), "utf-8");
            fs.writeFileSync(path + "/dataset_ids.txt", JSON.stringify(this.dataset_ids), "utf-8");
            if (this.courseMap.has(id)) {
                fs.writeFileSync(path + "/datasetCMap.txt", JSON.stringify(Array.from(this.courseMap.entries())));
            }
            else {
                fs.writeFileSync(path + "/datasetRMap.txt", JSON.stringify(Array.from(this.roomMap.entries())));
            }
            return resolve(id);
        });
    }
    updateGlobal() {
        if (!fs.existsSync("./data/dataset_ids.txt")) {
            return;
        }
        let data1 = fs.readFileSync(path + "/datasets.txt").toString("utf-8");
        let data2 = fs.readFileSync(path + "/dataset_ids.txt").toString("utf-8");
        let data3;
        let data4;
        if (fs.existsSync("./data/datasetRMap.txt")) {
            data4 = fs.readFileSync(path + "/datasetRMap.txt").toString("utf-8");
            let obj4 = JSON.parse(data4);
            let newRoomMap = new Map();
            let result2 = Object.entries(obj4);
            this.updateHelper(result2, newRoomMap, obj4);
            this.courseMap = newRoomMap;
        }
        if (fs.existsSync(".data/datasetCMap.txt")) {
            data3 = fs.readFileSync(path + "/datasetCMap.txt").toString("utf-8");
            let obj3 = JSON.parse(data3);
            let newCourseMap = new Map();
            let result1 = Object.entries(obj3);
            this.updateHelper(result1, newCourseMap, obj3);
            this.courseMap = newCourseMap;
        }
        let obj1 = JSON.parse(data1);
        let obj2 = JSON.parse(data2);
        let tempDatasets = [];
        let tempIDs = [];
        for (let i of obj1) {
            let tempDataset;
            tempDataset = { id: i.id, kind: i.kind, numRows: i.numRows };
            tempDatasets.push(tempDataset);
        }
        this.datasets = tempDatasets;
        for (let i of obj2) {
            let tempID;
            tempID = i;
            tempIDs.push(tempID);
        }
        this.dataset_ids = tempIDs;
    }
    updateHelper(result, newMap, obj) {
        let numDS = result.length;
        for (let n = 0; n < numDS; n++) {
            newMap.set(obj[n][0], obj[n][1]);
        }
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map