"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoomsDataset = void 0;
const IInsightFacade_1 = require("./IInsightFacade");
const tools_1 = require("./tools");
const htmlParse = require("parse5");
const http = require("http");
const requestURL = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team638/";
function getRoomsDetails(roomsPromise, locations, roomMap, id, datasets, dataset_ids, courseMap, resolve, reject, buildingData, buildingNames) {
    return Promise.all(roomsPromise).then(() => {
        let numRow = 0;
        let roomTable;
        let roomInfo = [];
        roomInfo = [];
        let i;
        for (i = 0; i < buildingData.length; i++) {
            roomTable = findTable(htmlParse.parse(buildingData[i]));
            if (roomTable !== null) {
                getRoomInfo(roomTable, locations, roomInfo, buildingNames[i], id);
            }
        }
        if (roomInfo.length === 0) {
            return Promise.reject(new IInsightFacade_1.InsightError("wrong adding"));
        }
        numRow = roomInfo.length;
        if (numRow !== 0) {
            roomMap.set(id, roomInfo);
            let newDataset = { id: id, kind: IInsightFacade_1.InsightDatasetKind.Rooms, numRows: numRow };
            datasets.push(newDataset);
            dataset_ids.push(id);
            (0, tools_1.writeToDisk)(IInsightFacade_1.InsightDatasetKind.Rooms, datasets, dataset_ids, courseMap, roomMap);
        }
    }).then(() => {
        return resolve(dataset_ids);
    }).catch(() => {
        return reject(new IInsightFacade_1.InsightError("rooms error"));
    });
}
function makePromise(fileContent, buildingData, buildingNames, file) {
    let promise = fileContent.async("string").then(function (fContent) {
        buildingData.push(fContent);
        buildingNames.push(file);
    });
    return promise;
}
function getRoomsInfo(buildPromise, content, locations, roomMap, id, datasets, dataset_ids, courseMap, resolve, reject, courseFiles) {
    return Promise.all(buildPromise).then(() => {
        let roomsPromise = [];
        let buildingData = [];
        let buildingNames = [];
        courseFiles.folder("rooms/campus/discover/buildings-and-classrooms").forEach((file) => {
            if (locations.has(file)) {
                let fileContent = courseFiles.folder("rooms/campus/discover/buildings-and-classrooms").file(file);
                let promise = makePromise(fileContent, buildingData, buildingNames, file);
                roomsPromise.push(promise);
            }
        });
        return getRoomsDetails(roomsPromise, locations, roomMap, id, datasets, dataset_ids, courseMap, resolve, reject, buildingData, buildingNames);
    });
}
function addRoomsDataset(courseFiles, objects, id, resolve, reject, content, courseMap, datasets, dataset_ids, roomMap) {
    if (courseFiles.folder(/rooms/).length <= 0) {
        return reject(new IInsightFacade_1.InsightError("wrong root"));
    }
    courseFiles.file("rooms/index.htm").async("string").then((indexData) => {
        let indexObject = htmlParse.parse(indexData);
        let locationsMap = new Map();
        let buildPromise = [];
        let table;
        table = findTable(indexObject);
        searchTable(table, locationsMap);
        for (let building of locationsMap.keys()) {
            let URLAddr = locationsMap.get(building)[1].replace(/\s/g, "%20");
            let buildingPromise;
            buildingPromise = getBuildingPromise(URLAddr, building, locationsMap.get(building)[0], locationsMap.get(building)[1], locationsMap);
            buildPromise.push(buildingPromise);
        }
        return getRoomsInfo(buildPromise, content, locationsMap, roomMap, id, datasets, dataset_ids, courseMap, resolve, reject, courseFiles);
    });
}
exports.addRoomsDataset = addRoomsDataset;
function getBuildingPromise(URLAddr, shortName, fullName, addr, buildingLocations) {
    return new Promise(function (resolve, reject) {
        http.get(requestURL + URLAddr, (res) => {
            res.setEncoding("utf8");
            let rawData = "";
            res.on("data", (chunk) => {
                rawData += chunk;
            });
            res.on("end", () => {
                const parsedData = JSON.parse(rawData);
                if (parsedData.error) {
                    return reject(new IInsightFacade_1.InsightError("Wrong response"));
                }
                else {
                    buildingLocations.get(shortName).push(parsedData.lat);
                    buildingLocations.get(shortName).push(parsedData.lon);
                    return resolve(buildingLocations);
                }
            });
        });
    });
}
function findTD(tbChildren, helper, buildingLocations) {
    for (let tbChildNode of tbChildren) {
        if (tbChildNode.nodeName === "tr") {
            let trChildren = tbChildNode.childNodes;
            for (let trChildNode of trChildren) {
                if (trChildNode.nodeName === "td") {
                    helper(trChildNode, buildingLocations);
                }
            }
        }
    }
}
function searchTable(tb, buildingLocations) {
    let cursor = 1;
    let pair = [];
    let currShortName = "";
    let currFullName = "";
    let currAddress = "";
    let tbChildren = tb.childNodes;
    const helper = (table, buildingMap) => {
        let keys = Object.keys(table);
        for (let key of keys) {
            if (key === "value" && !(0, tools_1.isSpace)(table.value) && table.value !== "More info") {
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
            }
            else if (key === "childNodes") {
                for (let childNode of table.childNodes) {
                    helper(childNode, buildingMap);
                }
            }
        }
    };
    findTD(tbChildren, helper, buildingLocations);
}
function findTable(indexObject) {
    let table;
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
function assignOBJ(roomObj, id, locations, code, currRoomNm, currRoomType, currRoomFur, currRoomHref, currRoomSeats, currRoomNum) {
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
function roomsHelps(cursor, currRoomNum, currRoomNm, currRoomSeats, currRoomFur, currRoomType, locations, currRoomHref, roomInfo, name, id) {
    const getRoomHelper = (subBody, code) => {
        for (let key of Object.keys(subBody)) {
            let roomObj = {};
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
                            assignOBJ(roomObj, id, locations, code, currRoomNm, currRoomType, currRoomFur, currRoomHref, currRoomSeats, currRoomNum);
                            roomInfo.push(roomObj);
                            cursor = 1;
                            break;
                    }
                }
            }
            else if (key === "attrs" && subBody.nodeName === "a" && cursor === 1) {
                currRoomHref = subBody.attrs[0].value.trim();
            }
            else if (key === "childNodes") {
                for (let childNode of subBody.childNodes) {
                    getRoomHelper(childNode, name);
                }
            }
        }
    };
    return getRoomHelper;
}
function findRoomTD(tbChildren, getRoomHelper, name) {
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
function getRoomInfo(roomTable, locations, roomInfo, name, id) {
    let cursor = 1, currRoomHref = "", currRoomNum = "", currRoomNm = "", currRoomSeats = 0, currRoomFur = "", currRoomType = "";
    const getRoomHelper = roomsHelps(cursor, currRoomNum, currRoomNm, currRoomSeats, currRoomFur, currRoomType, locations, currRoomHref, roomInfo, name, id);
    let tbChildren = roomTable.childNodes;
    findRoomTD(tbChildren, getRoomHelper, name);
}
//# sourceMappingURL=addRoomDS.js.map