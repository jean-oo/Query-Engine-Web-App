import Decimal from "decimal.js";

export function checkTrans(q: any,allFiled: any,dataset_ids: any, stringField: any): string[]{
	let trans: any = q.TRANSFORMATIONS;
	let transApply = trans.APPLY; // string array
	let transGroup = trans.GROUP; // object array
	let applyKeyArray: string[] = [];
	let applyToken = ["MAX", "MIN", "AVG","COUNT","SUM"];
	let applyNumToken = ["MAX", "MIN", "AVG","SUM"];
	if (!transApply || !transGroup || Object.keys(trans).length !== 2 || Object.keys(trans)[0] !== "GROUP" ||
		Object.keys(trans)[1] !== "APPLY" ) {
		return [];
	}
	if(!(transApply instanceof Array) || !(transGroup instanceof Array)){
		return [];// "invalid query, APPLY format wrong"
	}
	for(let g of transGroup) {
		if (!(dataset_ids.includes(g.split("_")[0])) || !allFiled.includes(g.split("_")[1])) {
			return [];
		}
		if (transGroup[0].split("_")[0] !== g.split("_")[0] || !allFiled.includes(g.split("_")[1])) {
			return [];
		}
	}
	for(let a of transApply) { // a eg: {"overallAvg": {"AVG": "courses_avg"}
		if(typeof a !== "object" || !a[ Object.keys(a)[0]]){
			return []; // 400: Apply body must be object
		}
		let aKey = Object.keys(a)[0];
		if(Object.keys(a).length !== 1 || (typeof aKey !== "string") || aKey.includes("_")){
			return []; // invalid query, Apply wrong
		}
		if (applyKeyArray.includes(aKey)){
			return []; // invalid query, group wrong
		}
		applyKeyArray.push(Object.keys(a)[0]);
		let aKKV = Object.values(a[aKey])[0];
		if (Object.keys(a[aKey]).length !== 1 || typeof aKKV !== "string" ||
			!applyToken.includes( Object.keys(a[aKey])[0])){
			return []; // invalid query, Apply wrong
		}
		if (!allFiled.includes(aKKV.split("_")[1]) || !dataset_ids.includes(aKKV.split("_")[0])) {
			return []; // invalid query, Apply wrong
		}
		if ( applyNumToken.includes(Object.keys(a[aKey])[0])){
			if (stringField.includes(aKKV.split("_")[1])){
				return []; // numToken evaluate string type
			}
		}
		// if (!dataset_ids.includes(aKKV.split("_")[0])) {
		// 	return []; // invalid query, Apply wrong
		// }
	}
	return applyKeyArray.concat(transGroup);
}

function applyHelper(gVal: any, applyRule: string, applyRuleKey: any): any {
	switch (applyRule){
		case "MAX":{
			return gVal.reduce((prev: any, cur: any) => {
				prev = prev > cur[applyRuleKey] ? prev : cur[applyRuleKey];
				return prev;
			}, gVal[0][applyRuleKey]);
			break;
		}
		case "MIN":{
			return gVal.reduce((prev: any, cur: any) => {
				prev = prev < cur[applyRuleKey] ? prev : cur[applyRuleKey];
				return prev;
			},gVal[0][applyRuleKey]);
			break;
		}
		case "AVG":{
			let total: Decimal = gVal.reduce((t: Decimal, cur: any) => {
				t = new Decimal(cur[applyRuleKey]).add(t);
				return t;
			},0);
			let avg = total.toNumber() / (gVal.length);
			return Number(avg.toFixed(2));
			break;
		}
		case "SUM":{
			let total = gVal.reduce((t: any, cur: any) => {
				t = t + cur[applyRuleKey];
				return t;
			},0);
			return (Number(total .toFixed(2)));
			break;
		}
		case "COUNT":{
			let totalArr = gVal.reduce((arr: any, cur: any) => {
				if(!arr.includes(cur[applyRuleKey])){
					arr.push(cur[applyRuleKey]);
				}
				return arr;
			},[]);
			return (totalArr.length);
			break;
		}
	}
}

function getApply(aGA: any, aK: any, query: any): any {
	let applyKey = Object.keys(aK)[0];
	let applyRule = Object.keys(aK[applyKey])[0];
	let applyRuleKey = Object.values(aK[applyKey])[0];
	let res = applyHelper(aGA[1],applyRule,applyRuleKey);
	return res; // tempAfterApply;
}

export function getTrans(set: any, query: any): any {
	let afterGroupArray: any = [];
	let afterApplyArray: any = [];
	afterGroupArray = (getGroup(set, query["TRANSFORMATIONS"]["GROUP"], afterGroupArray));
	let applyKey = query["TRANSFORMATIONS"]["APPLY"];
	for (let subAfterGrp of afterGroupArray) {
		for (let aGA of Object.entries(subAfterGrp)) {
			let temp: any = {};
			temp = aGA[1];
			temp = temp[0];
			for (let aK of applyKey) {
				// afterApplyArray = afterApplyArray.concat(getApply(aGA,aK,query));
				temp[Object.keys(aK)[0]] = getApply(aGA, aK, query);
			}
			afterApplyArray.push(temp);
		}
	}
	return afterApplyArray;
}

function getGroup(set: any, groupKeys: any, afterGroup: any): any {
	if (groupKeys.length === 1) {
		let i = groupBy(set, groupKeys[0]);
		afterGroup.push(i);
	}else{
		const firstKey = groupKeys[0];
		let grouped = groupBy(set, firstKey);
		for (let key of Object.keys(grouped)) {
			grouped[key] = getGroup(grouped[key], groupKeys.slice(1),afterGroup);
		}
	}
	return afterGroup;
}
function groupBy(set: any, gKey: any) {
	return set.reduce((acc: any, obj: any) => {
		let key = obj[gKey];
		acc[key] = acc[key] || [];
		acc[key].push(obj);
		return acc;
	}, {});
}
