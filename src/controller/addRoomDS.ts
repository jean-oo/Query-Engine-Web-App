import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isSpace, writeToDisk} from "./tools";
const htmlParse = require("parse5");
const http = require("http");
const requestURL: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team638/";
function getRoomsDetails(roomsPromise: any, locations: any, roomMap: any, id: string, datasets: any, dataset_ids:
	any, courseMap: any, resolve: (value: (PromiseLike<string[]> | string[])) => void, reject: (reason?: any) =>
	void, buildingData: any, buildingNames: any) {
	return Promise.all(roomsPromise).then(() => {
		let numRow: number = 0;
		let roomTable: any;
		let roomInfo: string[] = [];
		roomInfo = [];
		let i: number;
		for (i = 0; i < buildingData.length; i++) {
			roomTable = findTable(htmlParse.parse(buildingData[i]));
			if (roomTable !== null) {
				getRoomInfo(roomTable, locations, roomInfo, buildingNames[i],id);
			}
		}
		if (roomInfo.length === 0) {
			return Promise.reject(new InsightError("wrong adding"));
		}
		numRow = roomInfo.length;
		if (numRow !== 0) {
			roomMap.set(id, roomInfo);
			let newDataset: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms, numRows: numRow};
			datasets.push(newDataset);
			dataset_ids.push(id);
			writeToDisk(InsightDatasetKind.Rooms, datasets, dataset_ids, courseMap, roomMap);
		}
	}).then(() => {
		return resolve(dataset_ids);
	}).catch(() => {
		return reject(new InsightError("rooms error"));
	});
}

function makePromise(fileContent: any, buildingData: any[], buildingNames: any[], file: any) {
	let promise = fileContent.async("string").then(function (fContent: string) {
		buildingData.push(fContent);
		buildingNames.push(file);
	});
	return promise;
}

function getRoomsInfo(buildPromise: Array<Promise<string>>, content: any, locations: any, roomMap: any, id:
	string, datasets: any, dataset_ids: any, courseMap: any, resolve: (value: (PromiseLike<string[]> | string[])) =>
	void, reject: (reason?: any) => void, courseFiles: any) {
	return Promise.all(buildPromise).then(() => {
		let roomsPromise: any[] = [];
		let buildingData: any[] = [];
		let buildingNames: any[] = [];
		courseFiles.folder("rooms/campus/discover/buildings-and-classrooms").forEach((file: any) => {
			if (locations.has(file)) {
				let fileContent = courseFiles.folder("rooms/campus/discover/buildings-and-classrooms").file(file);
				let promise = makePromise(fileContent, buildingData, buildingNames, file);
				roomsPromise.push(promise);
			}
		});
		return getRoomsDetails(roomsPromise, locations, roomMap, id, datasets, dataset_ids, courseMap,
			resolve, reject, buildingData, buildingNames);
	});
}
export function addRoomsDataset(courseFiles: any, objects: any[], id: string,
	resolve: (value: (PromiseLike<string[]> | string[])) => void,
	reject: (reason?: any) => void, content: any, courseMap: any,
	datasets: any, dataset_ids: any, roomMap: any) {
	if (courseFiles.folder(/rooms/).length <= 0) {
		return reject(new InsightError("wrong root"));
	}
	courseFiles.file("rooms/index.htm").async("string").then((indexData: string) => {
		let indexObject = htmlParse.parse(indexData);   // parse to document(tree)
		// want to get the locations of buildings
		let locationsMap: any = new Map<string, string[]>(); // short name as key; full name, address, lat, lon as value
		let buildPromise: Array<Promise<string>> = [];
		let table: any;
		table = findTable(indexObject);
		searchTable(table, locationsMap);
		for (let building of locationsMap.keys()) {
			let URLAddr = locationsMap.get(building)[1].replace(/\s/g, "%20");
			let buildingPromise: any;
			buildingPromise = getBuildingPromise(URLAddr, building, locationsMap.get(building)[0],
				locationsMap.get(building)[1], locationsMap);
			buildPromise.push(buildingPromise);
		}
		return getRoomsInfo(buildPromise, content, locationsMap,
			roomMap, id, datasets, dataset_ids, courseMap, resolve, reject, courseFiles);
	});
}
function getBuildingPromise(URLAddr: any, shortName: any, fullName: any, addr: any, buildingLocations: any) {
	return new Promise(function (resolve, reject) {
		http.get(requestURL + URLAddr, (res: any) => {
			res.setEncoding("utf8");
			let rawData = "";
			res.on("data", (chunk: any) => {
				rawData += chunk;
			});
			res.on("end", () => {
				// parsedData: 1. lat/lon 2. error
				const parsedData = JSON.parse(rawData);
				if (parsedData.error) {
					return reject(new InsightError("Wrong response"));
				} else {
					buildingLocations.get(shortName).push(parsedData.lat);
					buildingLocations.get(shortName).push(parsedData.lon);
					return resolve(buildingLocations);
				}
			});
		});
	});
}

function findTD(tbChildren: any, helper: (table: any, buildingMap: any) => void, buildingLocations: any) {
	for (let tbChildNode of tbChildren) {
		if (tbChildNode.nodeName === "tr") {
			let trChildren = tbChildNode.childNodes;
			for (let trChildNode of trChildren) {
				// tr{...childNodes[#text,td,#text,td,#text,td,#text,td,#text,td,#text]...}
				if (trChildNode.nodeName === "td") {
					helper(trChildNode, buildingLocations);
				}
			}
		}
	}
}

function searchTable(tb: any, buildingLocations: any) {
	let cursor: number = 1;
	let pair: string[] = [];
	let currShortName: string = "";
	let currFullName: string = "";
	let currAddress: string = "";
	let tbChildren = tb.childNodes;
	const helper = (table: any, buildingMap: any) => {
		let keys: any = Object.keys(table);
		for (let key of keys) {
			if (key === "value" && !isSpace(table.value) && table.value !== "More info") {
				switch (cursor) {
					case 1:
						currShortName = table["value"].trim();
						cursor++;
						break;
					case 2:
						currFullName = table["value"].trim();
						cursor++;
						break;
					case 3:
						currAddress = table["value"].trim();
						cursor = 1;
						pair = [currFullName, currAddress];
						buildingMap.set(currShortName, pair);
				}
			} else if (key === "childNodes") {
				for (let childNode of table.childNodes) {
					helper(childNode, buildingMap);
				}
			}
		}
	};
	findTD(tbChildren, helper, buildingLocations);
}
function findTable(indexObject: any) {
	let table: any;
	if (!Object.keys(indexObject).includes("childNodes")) {
		return null;
	}
	if (indexObject.nodeName === "tbody") {
		table = indexObject;
	}
	for (let childNode of indexObject.childNodes) {
		if (indexObject.nodeName !== "tbody") {
			table = findTable(childNode);
		}
		if (table !== null) {
			return table;
		}
	}
	return null;
}

function assignOBJ(roomObj: any, id: any, locations: any, code: any, currRoomNm: string, currRoomType:
	string, currRoomFur: string, currRoomHref: string, currRoomSeats: number, currRoomNum: string) {
	roomObj[id + "_" + "fullname"] = locations.get(code)[0];
	roomObj[id + "_" + "shortname"] = code;
	roomObj[id + "_" + "number"] = currRoomNum;
	roomObj[id + "_" + "name"] = currRoomNm;
	roomObj[id + "_" + "address"] = locations.get(code)[1];
	roomObj[id + "_" + "lat"] = locations.get(code)[2];
	roomObj[id + "_" + "lon"] = locations.get(code)[3];
	roomObj[id + "_" + "seats"] = Number(currRoomSeats);
	roomObj[id + "_" + "type"] = currRoomType;
	roomObj[id + "_" + "furniture"] = currRoomFur;
	roomObj[id + "_" + "href"] = currRoomHref;
}

function roomsHelps(cursor: number, currRoomNum: string, currRoomNm: string, currRoomSeats: number, currRoomFur: string,
	currRoomType: string, locations: any, currRoomHref: string, roomInfo: string[], name: any, id: any) {
	const getRoomHelper = (subBody: any, code: any) => {
		for (let key of Object.keys(subBody)) {
			let roomObj: any = {};
			if (key === "value") {
				if (subBody.nodeName === "#text" && subBody.value.trim()) {
					switch (cursor) {
						case 1:
							currRoomNum = subBody.value.trim();
							currRoomNm = code + "_" + currRoomNum;
							cursor++;
							break;
						case 2:
							currRoomSeats = subBody.value.trim();
							cursor++;
							break;
						case 3:
							currRoomFur = subBody.value.trim();
							cursor++;
							if (currRoomNm === "LASR_105") {
								currRoomType = "";
								cursor++;
							}
							break;
						case 4:
							currRoomType = subBody[key].trim();
							cursor++;
							break;
						case 5:
							assignOBJ(roomObj, id, locations, code, currRoomNm, currRoomType, currRoomFur,
								currRoomHref, currRoomSeats, currRoomNum);
							roomInfo.push(roomObj);
							cursor = 1;
							break;
					}
				}
			} else if (key === "attrs" && subBody.nodeName === "a" && cursor === 1) {
				currRoomHref = subBody.attrs[0].value.trim();
			} else if (key === "childNodes") {
				for (let childNode of subBody.childNodes) {
					getRoomHelper(childNode, name);
				}
			}
		}
	};
	return getRoomHelper;
}

function findRoomTD(tbChildren: any, getRoomHelper: (subBody: any, code: any) => void, name: any) {
	for (let tbChildNode of tbChildren) {
		if (tbChildNode.nodeName === "tr") {
			let trChildren = tbChildNode.childNodes;
			for (let trChildNode of trChildren) {
				if (trChildNode.nodeName === "td") {
					getRoomHelper(trChildNode, name);
				}
			}
		}
	}
}

function getRoomInfo(roomTable: any, locations: any, roomInfo: string[], name: any, id: any) {
	let cursor = 1,currRoomHref: string = "", currRoomNum: string = "", currRoomNm: string = ""
		,currRoomSeats: number = 0, currRoomFur = "", currRoomType = "";
	const getRoomHelper = roomsHelps(cursor, currRoomNum, currRoomNm, currRoomSeats, currRoomFur, currRoomType,
		locations, currRoomHref, roomInfo, name, id);
	let tbChildren = roomTable.childNodes;
	findRoomTD(tbChildren, getRoomHelper, name);
}
