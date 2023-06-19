"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCoursesDataset = void 0;
const IInsightFacade_1 = require("./IInsightFacade");
const tools_1 = require("./tools");
function getCoursesInfo(courses, objects, courseMap, id) {
    let numRow = 0;
    for (const course of courses) {
        if (course.length !== 0) {
            let JsonFile;
            JsonFile = JSON.parse(course);
            for (const eachSection of JsonFile.result) {
                numRow++;
                if (eachSection.Subject || eachSection.Course || eachSection.Avg
                    || eachSection.Professor || eachSection.Title || eachSection.Pass
                    || eachSection.Fail || eachSection.Audit || eachSection.id) {
                    let newObj = {};
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
                    }
                    else {
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
function saveCoursesInfo(coursePromise, objects, courseMap, id, datasets, dataset_ids, roomMap, resolve, reject) {
    return Promise.all(coursePromise).then((courses) => {
        let numRow = getCoursesInfo(courses, objects, courseMap, id);
        let newDataset = { id: id, kind: IInsightFacade_1.InsightDatasetKind.Courses, numRows: numRow };
        datasets.push(newDataset);
        dataset_ids.push(id);
        (0, tools_1.writeToDisk)(IInsightFacade_1.InsightDatasetKind.Courses, datasets, dataset_ids, courseMap, roomMap);
    }).then(() => {
        return resolve(dataset_ids);
    }).catch(() => {
        return reject(new IInsightFacade_1.InsightError("courses error"));
    });
}
function addCoursesDataset(courseFiles, objects, id, resolve, reject, courseMap, datasets, dataset_ids, roomMap) {
    if (courseFiles.folder(/courses/).length <= 0) {
        return reject(new IInsightFacade_1.InsightError("wrong root"));
    }
    let files = courseFiles.files;
    let coursePromise = [];
    for (let courseFile of Object.keys(files)) {
        let file = courseFiles.file(courseFile);
        if (file) {
            coursePromise.push(file.async("string"));
        }
    }
    return saveCoursesInfo(coursePromise, objects, courseMap, id, datasets, dataset_ids, roomMap, resolve, reject);
}
exports.addCoursesDataset = addCoursesDataset;
//# sourceMappingURL=addCourseDS.js.map