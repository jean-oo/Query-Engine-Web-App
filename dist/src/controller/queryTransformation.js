"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrans = exports.checkTrans = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
function checkTrans(q, allFiled, dataset_ids, stringField) {
    let trans = q.TRANSFORMATIONS;
    let transApply = trans.APPLY;
    let transGroup = trans.GROUP;
    let applyKeyArray = [];
    let applyToken = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
    let applyNumToken = ["MAX", "MIN", "AVG", "SUM"];
    if (!transApply || !transGroup || Object.keys(trans).length !== 2 || Object.keys(trans)[0] !== "GROUP" ||
        Object.keys(trans)[1] !== "APPLY") {
        return [];
    }
    if (!(transApply instanceof Array) || !(transGroup instanceof Array)) {
        return [];
    }
    for (let g of transGroup) {
        if (!(dataset_ids.includes(g.split("_")[0])) || !allFiled.includes(g.split("_")[1])) {
            return [];
        }
        if (transGroup[0].split("_")[0] !== g.split("_")[0] || !allFiled.includes(g.split("_")[1])) {
            return [];
        }
    }
    for (let a of transApply) {
        if (typeof a !== "object" || !a[Object.keys(a)[0]]) {
            return [];
        }
        let aKey = Object.keys(a)[0];
        if (Object.keys(a).length !== 1 || (typeof aKey !== "string") || aKey.includes("_")) {
            return [];
        }
        if (applyKeyArray.includes(aKey)) {
            return [];
        }
        applyKeyArray.push(Object.keys(a)[0]);
        let aKKV = Object.values(a[aKey])[0];
        if (Object.keys(a[aKey]).length !== 1 || typeof aKKV !== "string" ||
            !applyToken.includes(Object.keys(a[aKey])[0])) {
            return [];
        }
        if (!allFiled.includes(aKKV.split("_")[1]) || !dataset_ids.includes(aKKV.split("_")[0])) {
            return [];
        }
        if (applyNumToken.includes(Object.keys(a[aKey])[0])) {
            if (stringField.includes(aKKV.split("_")[1])) {
                return [];
            }
        }
    }
    return applyKeyArray.concat(transGroup);
}
exports.checkTrans = checkTrans;
function applyHelper(gVal, applyRule, applyRuleKey) {
    switch (applyRule) {
        case "MAX": {
            return gVal.reduce((prev, cur) => {
                prev = prev > cur[applyRuleKey] ? prev : cur[applyRuleKey];
                return prev;
            }, gVal[0][applyRuleKey]);
            break;
        }
        case "MIN": {
            return gVal.reduce((prev, cur) => {
                prev = prev < cur[applyRuleKey] ? prev : cur[applyRuleKey];
                return prev;
            }, gVal[0][applyRuleKey]);
            break;
        }
        case "AVG": {
            let total = gVal.reduce((t, cur) => {
                t = new decimal_js_1.default(cur[applyRuleKey]).add(t);
                return t;
            }, 0);
            let avg = total.toNumber() / (gVal.length);
            return Number(avg.toFixed(2));
            break;
        }
        case "SUM": {
            let total = gVal.reduce((t, cur) => {
                t = t + cur[applyRuleKey];
                return t;
            }, 0);
            return (Number(total.toFixed(2)));
            break;
        }
        case "COUNT": {
            let totalArr = gVal.reduce((arr, cur) => {
                if (!arr.includes(cur[applyRuleKey])) {
                    arr.push(cur[applyRuleKey]);
                }
                return arr;
            }, []);
            return (totalArr.length);
            break;
        }
    }
}
function getApply(aGA, aK, query) {
    let applyKey = Object.keys(aK)[0];
    let applyRule = Object.keys(aK[applyKey])[0];
    let applyRuleKey = Object.values(aK[applyKey])[0];
    let res = applyHelper(aGA[1], applyRule, applyRuleKey);
    return res;
}
function getTrans(set, query) {
    let afterGroupArray = [];
    let afterApplyArray = [];
    afterGroupArray = (getGroup(set, query["TRANSFORMATIONS"]["GROUP"], afterGroupArray));
    let applyKey = query["TRANSFORMATIONS"]["APPLY"];
    for (let subAfterGrp of afterGroupArray) {
        for (let aGA of Object.entries(subAfterGrp)) {
            let temp = {};
            temp = aGA[1];
            temp = temp[0];
            for (let aK of applyKey) {
                temp[Object.keys(aK)[0]] = getApply(aGA, aK, query);
            }
            afterApplyArray.push(temp);
        }
    }
    return afterApplyArray;
}
exports.getTrans = getTrans;
function getGroup(set, groupKeys, afterGroup) {
    if (groupKeys.length === 1) {
        let i = groupBy(set, groupKeys[0]);
        afterGroup.push(i);
    }
    else {
        const firstKey = groupKeys[0];
        let grouped = groupBy(set, firstKey);
        for (let key of Object.keys(grouped)) {
            grouped[key] = getGroup(grouped[key], groupKeys.slice(1), afterGroup);
        }
    }
    return afterGroup;
}
function groupBy(set, gKey) {
    return set.reduce((acc, obj) => {
        let key = obj[gKey];
        acc[key] = acc[key] || [];
        acc[key].push(obj);
        return acc;
    }, {});
}
//# sourceMappingURL=queryTransformation.js.map