
import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";

export async function checkOpt(query: any, cAField: string[],ds_ids: string [], anykey: string []): Promise<any> {
	if (typeof query.OPTIONS !== "object" || Object.keys(query.OPTIONS).length > 2 || Object.keys(query.OPTIONS).length
		=== 0 || Object.keys(query.OPTIONS)[0] !== "COLUMNS") {
		return Promise.reject(new InsightError("invalid query, wrong Options part"));
	}
	let optKeys = Object.keys(query.OPTIONS);
	if (optKeys.length === 2 && optKeys[1] !== "ORDER"){
		return Promise.reject(new InsightError("400: OPTIONS missing ORDER"));
	}
	if (!query.OPTIONS.COLUMNS || !(query.OPTIONS.COLUMNS instanceof Array)) {
		return Promise.reject(new InsightError("invalid query, no COLUMNS or wrong format in COLUMNS"));
	}
	let optCol = query.OPTIONS.COLUMNS; // keys in columns
	for (let e of optCol) {
		if (typeof e !== "string"){
			return Promise.reject(new InsightError(" 400: Invalid type of COLUMN key"));
		}
		if (!anykey.includes(e)){
			if (!(ds_ids.includes(e.split("_")[0])) || optCol[0].split("_")[0] !== e.split("_")[0] ||
				!cAField.includes(e.split("_")[1])) {
				return Promise.reject(new InsightError("invalid query, in COLUMNS,Cannot query more than one dataset"));
			}
		}
		if(query.TRANSFORMATIONS && anykey.length < optCol.length){
			return Promise.reject(new InsightError("COLUMNS keys must be in GROUP or APPLY when TRANS is present"));
		}
	}
	try {
		await checkOrder(query,optCol);
	} catch (e){
		return Promise.reject(e);
	}

	return Promise.resolve(["checkOPTION--good"]);
}
function checkOrder(q: any, optCol: any): Promise<any>{
	if (q.OPTIONS.ORDER) {
		if (!(typeof q.OPTIONS.ORDER === "string") && !(typeof q.OPTIONS.ORDER === "object")) {
			return Promise.reject(new InsightError("invalid query, wrong format in ORDER"));
		}
		if (typeof q.OPTIONS.ORDER === "string"){ // e.g., "ORDER": "courses_avg"
			if (!(optCol.includes(q.OPTIONS.ORDER))) {
				return Promise.reject(new InsightError("invalid query, key in ORDER not in COLUMNS"));
			}
		}
		if (typeof q.OPTIONS.ORDER === "object"){ // eg:"ORDER": {"dir": "DOWN","keys": ["maxSeats"]}
			let orderValKeys = Object.keys(q.OPTIONS.ORDER); // eg: ["dir","keys"]
			if(orderValKeys.length !== 2 || orderValKeys[0] !== "dir" || orderValKeys[1] !== "keys"){
				return Promise.reject(new InsightError("invalid query, Order keys wrong"));
			}
			let orderValVals = Object.values(q.OPTIONS.ORDER); // eg: ["DOWN",["maxSeats"]]
			if (orderValVals[0] !== "DOWN" && orderValVals[0] !== "UP" || !(orderValVals[1] instanceof Array)){
				return Promise.reject(new InsightError("invalid query, 'dir' or 'key' values wrong"));
			}
			for(let v of orderValVals[1] ){
				if (v === null || v === undefined || typeof v !== "string" || !(optCol.includes(v))){ // all ORDER in COLUMNS
					return Promise.reject(new InsightError("invalid query, 'keys' values wrong"));
				}
			}
		}
	}
	return Promise.resolve();
}
export 	function getOpt(opt: any, set: any, courseNumericalField: string[],courseStringField: string[]): Promise<any> {
	let tempResult: InsightResult[] = [];
	let optcols = opt.COLUMNS;
	let count = 0;
	for (let eachSec of set) {
		let temp: any = {};
		for (let eachCol of optcols) {
			temp[eachCol] = eachSec[eachCol];
		}
		tempResult.push(temp); // this.result.push(temp);
		count++;
		if (count > 5000) {
			return Promise.reject(new ResultTooLargeError("result >5000"));
		}
	}
	if (opt.ORDER) {
		let optORDER = opt.ORDER;
		if (typeof optORDER === "string") {
			tempResult.sort(function (a: any, b: any) { // up
				if (a[optORDER] < b[optORDER]) {
					return  -1;
				} else if (a[optORDER] > b[optORDER]) {
					return  1;
				}
				return  0;
			});
		} else {
			let direction = optORDER["dir"];
			let anyKey = optORDER["keys"];
			tempResult.sort(function (a: any, b: any) {
				for (let aK of anyKey) {
					if (a[aK] < b[aK]) {
						return (direction === "UP") ? -1 : 1;
					} else if (a[aK] > b[aK]) {
						return (direction === "UP") ? 1 : -1;
					}
				}
				return 0;
			});

		}
	}
	return Promise.resolve(tempResult);
}
export async function checkWhere(whereVal: any,dataset_ids: string [],tempFieldID:
	string, cAllField: string[],cStringField: string[],cNumField: string[]): Promise<any> {
	let test: any;
	if (Object.keys(whereVal).length === 0) { // eg.: WHERE:{}
		return Promise.resolve(tempFieldID);
	}
	let filterKey = Object.keys(whereVal)[0];
	if (!(filterKey === "AND" || filterKey === "OR" || filterKey === "LT" || filterKey === "GT" ||
				filterKey === "EQ" || filterKey === "IS" || filterKey === "NOT")) {
		return Promise.reject(new InsightError("query invalid, filterKey is invalid"));
	}
	if (filterKey === "AND" || filterKey === "OR") { // AND， OR followed by array
		if (Object.keys(whereVal[filterKey]).length === 0) {
			return Promise.reject(new InsightError("invalid query, AND or OR must be a non-empty array"));
		}
		for (let each of whereVal[filterKey]) { // each is object (egObject { GT: Object { courses_avg: 90 } })
			if (each === null || each === undefined || typeof each !== "object"){
				return Promise.reject(new InsightError("invalid query, AND or OR must be object"));
			}
			try {
				test = checkWhere(each, dataset_ids, tempFieldID, cAllField,cStringField,cNumField);
				tempFieldID = test;
			}catch (e){
				return Promise.reject(e);
			}
		}
	}
	if (filterKey === "NOT") {
		if (Object.keys(whereVal.NOT).length === 0 || whereVal.NOT === null || typeof whereVal.NOT !== "object" ) {
			return Promise.reject(new InsightError("invalid query, empty in NOT"));
		}
		try {
			tempFieldID = await checkWhere(whereVal.NOT,dataset_ids,tempFieldID,cAllField,cStringField,cNumField);
		} catch (e){
			return Promise.reject(e);
		}
	}
	try {
		const res = await CompareCheck(filterKey, whereVal,dataset_ids,tempFieldID,cAllField,cStringField,cNumField);
		tempFieldID = res;
	} catch (e) {
		return Promise.reject(e);
	}
	return Promise.resolve(tempFieldID);
}
async function  CompareCheck(filterKey: any, whereFilter: any,dataset_ids: string[],tempFieldID:
	string, courseAllField: string[],courseStringField: string[],courseNumericalField: string[]): Promise<any> {
	if (filterKey === "LT" || filterKey === "GT" || filterKey === "EQ"){
		try {
			const res = await helperCheckWhere(whereFilter[filterKey],dataset_ids,tempFieldID,courseAllField,
				courseStringField,courseNumericalField);
			tempFieldID = res;
		} catch (e) {
			return Promise.reject(e);
		}
	}
	if (filterKey === "IS") {
		let isValue: string = Object.values(whereFilter["IS"])[0] as string;
		if (isValue.includes("*")) {
			if (isValue[0] === "*") {
				isValue = isValue.slice(1);
			}
			if (isValue[isValue.length - 1] === "*") {
				isValue = isValue.slice(0, isValue.length - 1);
			}
			if (isValue !== "" && isValue.replace(/[\x2a]/g, "") === "") {
				return Promise.reject(new InsightError("400: Asterisks (*) can only be the first or last characters"));
			}
			if (isValue.includes("*")) {
				return Promise.reject(new InsightError("400: Asterisks (*) can only be the first/last characters"));
			}
		}
		try {
			const res = await helperCheckWhere(whereFilter.IS, dataset_ids, tempFieldID, courseAllField,
				courseStringField, courseNumericalField);
			tempFieldID = res;
		} catch (e) {
			return Promise.reject(e);
		}
	}
	return Promise.resolve(tempFieldID);
}
function helperCheckWhere(whereFilterObject: any,dataset_ids: string[],tempFieldID:
	string, courseAllField: string[],courseStringField: string[],courseNumericalField: string[]): Promise<any> {
	return new Promise((resolve, reject) => {
		if (whereFilterObject === null || typeof whereFilterObject !== "object" ||
			Object.keys(whereFilterObject).length === 0) {
			return reject(new InsightError("invalid query, empty"));
		}
		let fieldID = Object.keys(whereFilterObject)[0].split("_")[0];
		console.log(fieldID);
		console.log(dataset_ids);
		if (!(dataset_ids.includes(fieldID))) {
			return reject(new InsightError("invalid query, in WHERE,course_att, course not in dataset_ids"));
		}
		if (tempFieldID === "") {
			tempFieldID = fieldID;
		}
		if (!courseAllField.includes(Object.keys(whereFilterObject)[0].split("_")[1]) ||
			Object.values(whereFilterObject)[0] === undefined || Object.values(whereFilterObject)[0] === null) {
			return reject(new InsightError("invalid query, field attribute not in dataset, 400: body must be object"));
		}
		if(courseStringField.includes(Object.keys(whereFilterObject)[0].split("_")[1])){
			if (typeof whereFilterObject[Object.keys(whereFilterObject)[0]] !== "string") {
				return reject(new InsightError("invalid query, value of field incorrect"));
			}
		}
		if(courseNumericalField.includes(Object.keys(whereFilterObject)[0].split("_")[1])){
			if (typeof whereFilterObject[Object.keys(whereFilterObject)[0]] !== "number") {
				return reject(new InsightError("invalid query, value of field incorrect"));
			}
		}
		return resolve(tempFieldID);
	});
}
export function getWhere(whereFilter: any, val: any,c: any): boolean {
	if (Object.keys(whereFilter).length === 0) {
		return true;
	}
	if (Object.keys(whereFilter)[0] === "AND") {
		let res = true;
		for (let filed of whereFilter.AND) {
			res = res && getWhere(filed, val,c);
		}
		return res;
	}
	if (Object.keys(whereFilter)[0] === "OR") {
		let res = false;
		for (let filed of whereFilter.OR) {
			res = (res || getWhere(filed, val,c));
		}
		return res;
	}
	if (Object.keys(whereFilter)[0] === "NOT") {
		let res: boolean;
		res = !getWhere(whereFilter.NOT, val,c);
		return res;
	}
	let fieldKey = Object.keys(whereFilter[Object.keys(whereFilter)[0]])[0];
	if (Object.keys(whereFilter)[0] === "EQ") {
		return val[fieldKey] === whereFilter.EQ[fieldKey];
	}
	if (Object.keys(whereFilter)[0] === "GT") {
		if (whereFilter.GT[fieldKey] < val[fieldKey]) {
			c++;
			return true;
		}
		return false;
	}
	if (Object.keys(whereFilter)[0] === "LT") {
		if (whereFilter.LT[fieldKey] > val[fieldKey]) {
			c++;
			return true;
		}
		return false;
	}
	if (Object.keys(whereFilter)[0] === "IS") {
		return checkIs(whereFilter, val,c);
	}
	return false;
}
function checkIs(whereFilter: any, val: any, c: any): boolean {
	let fieldKey = Object.keys(whereFilter.IS)[0];
	let fieldVal = whereFilter.IS[fieldKey] as string;
	if (fieldVal.slice(0, 1) === "*" && fieldVal.slice(-1) !== "*") { // *xx
		let inp = fieldVal.split("*")[1];
		if (val[fieldKey].slice(-(inp.length)) === inp) {
			return true;
		}
	} else if (fieldVal.slice(0, 1) === "*" && fieldVal.slice(-1) === "*") { // *xx*
		let inp = fieldVal.split("*")[1];
		if (val[fieldKey].indexOf(inp) !== -1) {
			return true;
		}
	} else if (fieldVal.slice(-1) === "*") { // xx*
		let inp = fieldVal.split("*")[0];
		if (val[fieldKey].slice(0, inp.length) === inp) {
			c++;
			return true;
		}
	} else if (whereFilter.IS[fieldKey] === val[fieldKey]) { // no *
		if (c > 5000){
			return false;
		}
		c++;
		return true;
	}
	return false;
}

