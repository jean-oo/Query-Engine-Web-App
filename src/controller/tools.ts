import {InsightDatasetKind} from "./IInsightFacade";
import * as fs from "fs-extra";
const path = "./data";
export function writeToDisk(kind: InsightDatasetKind, datasets: any, dataset_ids: any, courseMap: any, roomMap: any) {
	// want to write the datas into disk
	if (!fs.existsSync(path)) {                  // helper3
		fs.mkdirSync(path);
	}
	fs.writeFileSync(path + "/datasets.txt", JSON.stringify(datasets));
	fs.writeFileSync(path + "/dataset_ids.txt", JSON.stringify(dataset_ids));
	if (kind === InsightDatasetKind.Courses) {
		fs.writeFileSync(path + "/datasetCMap.txt", JSON.stringify(Array.from(courseMap.entries())));
	} else {
		fs.writeFileSync(path + "/datasetRMap.txt", JSON.stringify(Array.from(roomMap.entries())));
	}
}
export function isSpace(str: any) {
	return !str.replace(/\s/g, "").length;
}
