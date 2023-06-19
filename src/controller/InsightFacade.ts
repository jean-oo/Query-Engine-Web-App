import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import {addCoursesDataset} from "./addCourseDS";
import {addRoomsDataset} from "./addRoomDS";
import * as fs from "fs-extra";
import {isSpace} from "./tools";
const path = "./data";
const JSZip = require("jszip");
import {checkWhere,checkOpt, getOpt,getWhere} from "./doQuery";
import {checkTrans, getTrans} from "./queryTransformation";
import {clearDisk} from "../../test/TestUtils";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
	// public dataset: Section[];
	public datasets: InsightDataset[];
	public dataset_ids: string [];
	private courseMap: any;
	private courseAllField: string[];
	private courseStringField: string[];
	private courseNumericalField: string[];
	public result: InsightResult[];
	private listGetWhere: any;
	private tempFieldID: string;
	private roomMap: any;
	public  roomAllField: string[];
	public  roomStringField: string[];
	public  roomNumericalField: string[];
	constructor() {
		// console.log("InsightFacadeImpl::init()");
		this.datasets = [];
		this.dataset_ids = [];
		this.courseMap = new Map();
		this.roomMap = new Map();
		this.result = [];
		this.listGetWhere = [];
		this.tempFieldID = "";
		this.courseAllField = ["avg","pass","fail","audit","year","dept","id","instructor","title","uuid"];
		this.courseStringField = ["dept","id","instructor","title","uuid"];
		this.courseNumericalField = ["avg","pass","fail","audit","year"];
		this.roomAllField = ["fullname","shortname","number","name","address","lat","lon","seats","type","furniture",
			"href"];
		this.roomStringField = ["fullname","shortname","number","name","address","type","furniture","href"];
		this.roomNumericalField = ["lat","lon","seats"];
		// let courses = fs.readFileSync("test/resources/archives/courses.zip").toString("base64");
		// this.addDataset("courses", courses, InsightDatasetKind.Courses);
		// console.log(this.dataset_ids);
		// console.log("!!!!");
		this.updateGlobal();
		// console.log(this.dataset_ids);
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let objects: any [] = [];
		// this.updateGlobal();
		// console.log("1");
		return new Promise<string[]>((resolve, reject) => {
			// An id is invalid if it contains an underscore, or is only whitespace characters.
			if (id.includes("_") || isSpace(id)) {
				return reject(new InsightError("id is invalid"));
			}
			// Only course kind
			// If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
			if (this.dataset_ids.includes(id)) {
				return reject(new InsightError("dataset already existed"));
			}
			// console.log("addr1");
			// unzip zip file and check the validation of section
			return new JSZip().loadAsync(content, {base64: true}).then((courseFiles: any) => {
				if (kind === InsightDatasetKind.Courses) {
					return addCoursesDataset(courseFiles, objects, id, resolve, reject, this.courseMap,
						this.datasets, this.dataset_ids, this.roomMap);
				} else {
					return addRoomsDataset(courseFiles, objects, id, resolve, reject, content, this.courseMap,
						this.datasets, this.dataset_ids, this.roomMap);
				}
			}).catch(() => {
				return reject(new InsightError("zip file error"));
			});
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		// this.updateGlobal();
		return new Promise<InsightDataset[]>((resolve) => {
			return resolve(this.datasets);
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		// this.updateGlobal();
		if (query === undefined) {
			return Promise.reject(new InsightError("query is null"));
		}
		let queryO = query as any;
		let queryKeys = Object.keys(queryO);
		if (queryKeys.length === 3 && queryKeys[2] !== "TRANSFORMATIONS") {
			return Promise.reject(new InsightError("invalid query,wrong in TRANSFORMATIONS"));
		}
		if (queryKeys.length < 2 || queryKeys.length > 3 || queryKeys[0] !== "WHERE" || queryKeys[1] !== "OPTIONS" ||
			!queryO.WHERE || !queryO.OPTIONS ) {
			return Promise.reject(new InsightError("invalid query, no WHERE or no OPTIONS"));
		}
		let optionsThing = queryO.OPTIONS;
		let selectedSets: any = [];
		let type: any;
		let allField = this.courseAllField;
		let stringFiled = this.courseStringField;
		let numericalFiled = this.courseNumericalField;
		let map = this.courseMap;
		if (!this.getType(queryO)){
			return Promise.reject(new InsightError("400"));
		}
		for (let s of this.datasets){
			if (s.id === this.tempFieldID){
				type = s.kind;
				break;
			}
		}
		if ("rooms" === type){
			allField = this.roomAllField;
			stringFiled = this.roomStringField;
			numericalFiled = this.roomNumericalField;
			map = this.roomMap;
		}
		return  this.getQuery(queryO,queryO.WHERE,selectedSets,allField,stringFiled,numericalFiled,map,optionsThing);
	}

	private getType(queryO: any): boolean {

		if (queryO.TRANSFORMATIONS){
			if (Object.keys(queryO.TRANSFORMATIONS)[1] !== "APPLY"){
				return false; // " Apply rule must be object";
			}
			if(queryO.TRANSFORMATIONS.APPLY && Object.keys(queryO.TRANSFORMATIONS.APPLY).length !== 0){
				if (!(queryO.TRANSFORMATIONS.APPLY)[0] || typeof queryO.TRANSFORMATIONS.APPLY[0] !== "object"){
					return false; // " Apply rule must be object";
				}
				let applyRuleEntire = Object.values((queryO.TRANSFORMATIONS.APPLY)[0]);
				let temp: any;
				temp = Object.values(applyRuleEntire)[0];
				if (!temp) {
					return false; // " Apply rule must be object";
				}
				temp = Object.values(temp)[0];
				this.tempFieldID = temp.split("_")[0];
			}
		}
		if (Object.keys(queryO.OPTIONS)[0] !== "COLUMNS"){
			return false; // "400: OPTIONS missing COLUMNS";
		}
		for(let o of queryO.OPTIONS.COLUMNS ) {
			if (typeof o !== "string" || o === null || o === undefined){
				return false; // 400: Invalid type of COLUMN key";
			}
			if (o.includes("_")){
				this.tempFieldID = o.split("_")[0];
				break;
			}
		}
		return true;
	}

	private async getQuery(queryO: any,whereFilter: any,selectedSets: any,allField: any,stringFiled: any
		,numericalFiled: any,map: any, optionsThing: any): Promise<any> {
		try {
			const res = await checkWhere(whereFilter,this.dataset_ids,this.tempFieldID,allField,
				stringFiled,numericalFiled);
			this.tempFieldID = res;
		} catch (e) {
			return Promise.reject(e);
		}
		let anykey: string[] = [];
		if(queryO.TRANSFORMATIONS) {
			if (checkTrans(queryO,this.courseAllField,this.dataset_ids,stringFiled) === []){
				return Promise.reject(new InsightError("invalid query, wrong TRANSFORMATIONS"));
			}
			anykey = checkTrans(queryO,allField,this.dataset_ids,stringFiled);
		}
		try {
			await checkOpt(queryO,allField,this.dataset_ids,anykey);
		} catch (e1) {
			return Promise.reject(e1);
		}
		const mapValue = map.get(this.tempFieldID);
		if (mapValue !== undefined) {
			let c = 0;
			for (let val of mapValue) {
				if (getWhere(whereFilter, val,c)) {
					selectedSets.push(val);
				}
			}
		}
		if(queryO.TRANSFORMATIONS) {
			let res = await getTrans(selectedSets, queryO);
			selectedSets = res;
		}
		try{
			const res2 = await getOpt(optionsThing,selectedSets,numericalFiled,stringFiled);
			return Promise.resolve(res2);
		} catch (e) {
			return Promise.reject(e);
		}
	}

	public removeDataset(id: string): Promise<string> {
		// this.updateGlobal();
		return new Promise<string>((resolve, reject) => {
			console.log("remover1");
			// An id is invalid if it contains an underscore, or is only whitespace characters.
			if (id.includes("_") || id === " " || isSpace(id)) {
				return reject(new InsightError("id is invalid"));
			}
			// If there is no such id in dataset, the dataset should be rejected and not saved.
			if (!this.dataset_ids.includes(id)) {
				return reject(new NotFoundError("There is no such dataset"));
			}
			// // find the index of the id in array (two arrays should have the same index)
			this.datasets = this.datasets.filter((dataset: InsightDataset) => dataset.id !== id);
			this.dataset_ids = this.dataset_ids.filter((eachID: string) => eachID !== id);
			if (this.courseMap.has(id)) {
				this.courseMap.delete(id);
			} else {
				this.roomMap.delete(id);
			}
			// want to write the datas into disk
			if (!fs.existsSync(path)) {
				fs.mkdirSync(path);
			}
			fs.writeFileSync(path + "/datasets.txt", JSON.stringify(this.datasets), "utf-8");
			fs.writeFileSync(path + "/dataset_ids.txt", JSON.stringify(this.dataset_ids), "utf-8");
			if (this.courseMap.has(id)) {
				fs.writeFileSync(path + "/datasetCMap.txt", JSON.stringify(Array.from(this.courseMap.entries())));
			} else {
				fs.writeFileSync(path + "/datasetRMap.txt", JSON.stringify(Array.from(this.roomMap.entries())));
			}
			return resolve(id);
		});
	}

	private updateGlobal() {
		if (!fs.existsSync("./data/dataset_ids.txt")) {
			return;
		}      // if there is no dataset on disk, return.
		let data1: string = fs.readFileSync(path + "/datasets.txt").toString("utf-8");
		let data2: string = fs.readFileSync(path + "/dataset_ids.txt").toString("utf-8");
		let data3: string;
		let data4: string;
		if (fs.existsSync("./data/datasetRMap.txt")){
			data4 = fs.readFileSync(path + "/datasetRMap.txt").toString("utf-8");
			let obj4 = JSON.parse(data4);
			let newRoomMap = new Map<string, any>();
			let result2 = Object.entries(obj4);         // rooms datasets
			this.updateHelper(result2, newRoomMap, obj4);
			this.courseMap = newRoomMap;
		}
		if (fs.existsSync(".data/datasetCMap.txt")){
			data3 = fs.readFileSync(path + "/datasetCMap.txt").toString("utf-8");
			let obj3 = JSON.parse(data3);
			let newCourseMap = new Map<string, any>();
			let result1 = Object.entries(obj3);       // courses datasets
			this.updateHelper(result1, newCourseMap, obj3);
			this.courseMap = newCourseMap;
		}
		let obj1 = JSON.parse(data1);
		let obj2 = JSON.parse(data2);
		let tempDatasets: InsightDataset[] = [];
		let tempIDs: string[] = [];
		for (let i of obj1) {
			let tempDataset: InsightDataset;
			tempDataset = {id: i.id, kind: i.kind, numRows: i.numRows};
			tempDatasets.push(tempDataset);
		}
		this.datasets = tempDatasets;
		for (let i of obj2) {
			let tempID: string;
			tempID = i;
			tempIDs.push(tempID);
		}
		this.dataset_ids = tempIDs;
	}

	private updateHelper(result: Array<[string, unknown]>, newMap: Map<string, any>, obj: any) {
		let numDS: number = result.length;      // # of datasets
		for (let n = 0; n < numDS; n++) {
			newMap.set(obj[n][0], obj[n][1]);
		}
	}
}
