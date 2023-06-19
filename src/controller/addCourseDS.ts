import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {writeToDisk} from "./tools";


function getCoursesInfo(courses: Array<Awaited<string>>, objects: any[], courseMap: any, id: string) {
	let numRow: number = 0;
	for (const course of courses) {
		// a valid course has at least one valid section, which means result array has at least
		// elements.
		if (course.length !== 0) {
			let JsonFile: any;
			JsonFile = JSON.parse(course);
			for (const eachSection of JsonFile.result) {
				// increase number of rows by 1
				numRow++;
				if (eachSection.Subject || eachSection.Course || eachSection.Avg
					|| eachSection.Professor || eachSection.Title || eachSection.Pass
					|| eachSection.Fail || eachSection.Audit || eachSection.id) {
					let newObj: any = {};
					newObj[id + "_" + "dept"] = eachSection.Subject;
					newObj[id + "_" + "id"] = eachSection.Course;
					newObj[id + "_" + "avg"] = Number(eachSection.Avg);
					newObj[id + "_" + "instructor"] = eachSection.Professor;
					newObj[id + "_" + "title"] = eachSection.Title;
					newObj[id + "_" + "pass"] = Number(eachSection.Pass);
					newObj[id + "_" + "fail"] = Number(eachSection.Fail);
					newObj[id + "_" + "audit"] = Number(eachSection.Audit);
					newObj[id + "_" + "uuid"] = String(eachSection.id);
					if (String(eachSection.Section) === "overall") {
						newObj[id + "_" + "year"] = 1900;
						objects.push(newObj);
					} else {
						newObj[id + "_" + "year"] = Number(eachSection.Year);
						objects.push(newObj);
					}
				}
			}
			courseMap.set(id, objects);
		}
	}
	return numRow;
}

function saveCoursesInfo(coursePromise: Array<Promise<string>>, objects: any[], courseMap: any, id: string, datasets:
	any, dataset_ids: any,roomMap: any, resolve: (value: (PromiseLike<string[]> | string[])) => void,reject:
	(reason?: any) => void) {
	return Promise.all(coursePromise).then((courses) => {
		// all promise with files resolved
		// want to get information of each course
		// console.log(coursePromise);
		let numRow = getCoursesInfo(courses, objects, courseMap, id);
		let newDataset: InsightDataset = {id: id, kind: InsightDatasetKind.Courses, numRows: numRow};
		datasets.push(newDataset);
		dataset_ids.push(id);
		writeToDisk(InsightDatasetKind.Courses, datasets, dataset_ids, courseMap, roomMap);
	}).then(() => {
		return resolve(dataset_ids);
	}).catch(() => {
		return reject(new InsightError("courses error"));
	});
}

export function addCoursesDataset(courseFiles: any, objects: any[], id: string, resolve: (value: (PromiseLike<string[]>
	| string[])) => void, reject: (reason?: any) => void, courseMap: any, datasets: any, dataset_ids: any, roomMap:
	any) {
	if (courseFiles.folder(/courses/).length <= 0) {
		return reject(new InsightError("wrong root"));
	}
	// every files contained in the loaded sections
	// want to push every file as a promise into an array
	// want to find each file's name
	let files = courseFiles.files;
	let coursePromise: Array<Promise<string>> = [];
	for (let courseFile of Object.keys(files)) {
		let file = courseFiles.file(courseFile);
		// console.log(file);
		if (file) {
			coursePromise.push(file.async("string"));
		}
	}
	return saveCoursesInfo(coursePromise, objects, courseMap, id, datasets, dataset_ids, roomMap, resolve, reject);
}
