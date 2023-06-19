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
exports.isSpace = exports.writeToDisk = void 0;
const IInsightFacade_1 = require("./IInsightFacade");
const fs = __importStar(require("fs-extra"));
const path = "./data";
function writeToDisk(kind, datasets, dataset_ids, courseMap, roomMap) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    fs.writeFileSync(path + "/datasets.txt", JSON.stringify(datasets));
    fs.writeFileSync(path + "/dataset_ids.txt", JSON.stringify(dataset_ids));
    if (kind === IInsightFacade_1.InsightDatasetKind.Courses) {
        fs.writeFileSync(path + "/datasetCMap.txt", JSON.stringify(Array.from(courseMap.entries())));
    }
    else {
        fs.writeFileSync(path + "/datasetRMap.txt", JSON.stringify(Array.from(roomMap.entries())));
    }
}
exports.writeToDisk = writeToDisk;
function isSpace(str) {
    return !str.replace(/\s/g, "").length;
}
exports.isSpace = isSpace;
//# sourceMappingURL=tools.js.map