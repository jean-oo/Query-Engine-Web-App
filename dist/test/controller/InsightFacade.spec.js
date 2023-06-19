"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const chai_1 = require("chai");
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const IInsightFacade_1 = require("../../src/controller/IInsightFacade");
const fs_extra_1 = __importDefault(require("fs-extra"));
const mocha_1 = require("mocha");
const folder_test_1 = require("@ubccpsc310/folder-test");
const TestUtils_1 = require("../TestUtils");
(0, chai_1.use)(chai_as_promised_1.default);
(0, mocha_1.describe)("InsightFacade", function () {
    let courses;
    let room;
    before(function () {
        courses = fs_extra_1.default.readFileSync("test/resources/archives/courses.zip").toString("base64");
        room = fs_extra_1.default.readFileSync("test/resources/archives/rooms.zip").toString("base64");
    });
    (0, mocha_1.describe)("addDataset", function () {
        let insightFacade;
        beforeEach(function () {
            (0, TestUtils_1.clearDisk)();
            insightFacade = new InsightFacade_1.default();
        });
        it("should add a valid dataset", function () {
            const result = insightFacade.addDataset("r", room, IInsightFacade_1.InsightDatasetKind.Rooms);
            return (0, chai_1.expect)(result).eventually.to.deep.equal(["r"]);
        });
        it("should reject with a dataset with whitespace id", function () {
            const result = insightFacade.addDataset(" ", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should reject with a dataset with underscore id", function () {
            const result = insightFacade.addDataset("_", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should reject with a dataset with underscore and whitespace id", function () {
            const result = insightFacade.addDataset("_ ", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should reject with a dataset with underscore and char id", function () {
            const result = insightFacade.addDataset("_a", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should reject with a dataset with underscore and char id", function () {
            const result = insightFacade.addDataset("a_", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should add a valid dataset with whitespace(front) and char id", function () {
            const result = insightFacade.addDataset(" c", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.deep.equal([" c"]);
        });
        it("should add a valid dataset with whitespace(back) and char id", function () {
            const result = insightFacade.addDataset("c ", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).eventually.to.deep.equal(["c "]);
        });
        it("should reject with a duplicate dataset", function () {
            const result = insightFacade.addDataset("c", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => insightFacade.addDataset("c", courses, IInsightFacade_1.InsightDatasetKind.Courses));
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should add a different dataset", function () {
            const result = insightFacade.addDataset("c2", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => insightFacade.addDataset("c1", courses, IInsightFacade_1.InsightDatasetKind.Courses));
            return (0, chai_1.expect)(result).eventually.to.deep.equal(["c2", "c1"]);
        });
    });
    (0, mocha_1.describe)("removeDataset", function () {
        let insightFacade;
        beforeEach(function () {
            (0, TestUtils_1.clearDisk)();
            insightFacade = new InsightFacade_1.default();
        });
        it("should remove a dataset with a valid id from list with only one dataset", function () {
            const result = insightFacade.addDataset("c", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("c")).then(() => insightFacade.listDatasets());
            return (function () {
                (0, chai_1.expect)(result).eventually.to.be.an.instanceof(Array);
                (0, chai_1.expect)(result).eventually.to.have.length(0);
            });
        });
        it("should not remove a dataset with an non-exit id from list with only one dataset", function () {
            const result = insightFacade.addDataset("e", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("d"));
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
        it("should not remove a dataset from an empty list", function () {
            const result = insightFacade.removeDataset("pass");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
        it("should remove a dataset(valid id) from list with many datasets", function () {
            return insightFacade.addDataset("c", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return insightFacade.addDataset("d", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then(() => {
                return insightFacade.removeDataset("d");
            })
                .then(() => {
                return insightFacade.listDatasets();
            })
                .then((res) => {
                (0, chai_1.expect)(res).to.be.an.instanceof(Array);
                (0, chai_1.expect)(res).to.have.length(1);
                const theCourse = res.find((dataset) => dataset.id === "c");
                (0, chai_1.expect)(theCourse).to.be.exist;
                (0, chai_1.expect)(theCourse).to.deep.equal({
                    id: "c",
                    kind: IInsightFacade_1.InsightDatasetKind.Courses,
                    numRows: 64612,
                });
            });
        });
        it("should not remove a dataset with an invalid id(underscore)", function () {
            const result = insightFacade.removeDataset("_");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should not remove a dataset with an invalid id(whitespace)", function () {
            const result = insightFacade.removeDataset(" ");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should not remove a dataset with an invalid id(more whitespaces)", function () {
            const result = insightFacade.removeDataset("   ");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should not remove a dataset with an invalid id(whitespacesnunderscore)", function () {
            const result = insightFacade.removeDataset(" _");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should not remove a dataset with an invalid id(hasUnderscore)", function () {
            const result = insightFacade.removeDataset("c_");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should not remove a dataset with an invalid id(hasUnderscore)", function () {
            const result = insightFacade.removeDataset("_c");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should not remove a dataset with an invalid id(hasUnderscore)", function () {
            const result = insightFacade.removeDataset("_c_");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should remove a dataset with a valid id which has whitespace(back)", function () {
            const result = insightFacade.addDataset("c ", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset("c "));
            return (function () {
                (0, chai_1.expect)(result).eventually.to.be.an.instanceof(Array);
                (0, chai_1.expect)(result).eventually.to.have.length(0);
            });
        });
        it("should remove a dataset with a valid id which has whitespace(front)", function () {
            const result = insightFacade.addDataset(" c", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => insightFacade.removeDataset(" c"));
            return (function () {
                (0, chai_1.expect)(result).eventually.to.be.an.instanceof(Array);
                (0, chai_1.expect)(result).eventually.to.have.length(0);
            });
        });
    });
    (0, mocha_1.describe)("ListDataset", function () {
        let insightFacade;
        beforeEach(function () {
            (0, TestUtils_1.clearDisk)();
            insightFacade = new InsightFacade_1.default();
        });
        it("should list empty", function () {
            return insightFacade.listDatasets().then((res) => {
                (0, chai_1.expect)(res).to.be.an.instanceof(Array);
                (0, chai_1.expect)(res).to.have.length(0);
            });
        });
        it("should list one dataset", function () {
            return insightFacade.addDataset("c3", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then((addedIds) => {
                return insightFacade.listDatasets();
            })
                .then((res) => {
                (0, chai_1.expect)(res).to.deep.equal([{
                        id: "c3",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    }]);
                (0, chai_1.expect)(res).to.be.an.instanceof(Array);
                (0, chai_1.expect)(res).to.have.length(1);
                const [theOne] = res;
                (0, chai_1.expect)(theOne).to.have.property("id");
                (0, chai_1.expect)(theOne.id).to.equal("c3");
            });
        });
        it("should list two datasets", function () {
            return insightFacade.addDataset("c1", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return insightFacade.addDataset("c2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then(() => {
                return insightFacade.listDatasets();
            })
                .then((res) => {
                (0, chai_1.expect)(res).to.be.an.instanceof(Array);
                (0, chai_1.expect)(res).to.have.length(2);
                const theCourse = res.find((dataset) => dataset.id === "c1");
                (0, chai_1.expect)(theCourse).to.exist;
                (0, chai_1.expect)(theCourse).to.deep.equal({
                    id: "c1",
                    kind: IInsightFacade_1.InsightDatasetKind.Courses,
                    numRows: 64612,
                });
            });
        });
    });
    (0, mocha_1.describe)("Dynamic folder test", function () {
        let insightFacade;
        before(function () {
            (0, TestUtils_1.clearDisk)();
            insightFacade = new InsightFacade_1.default();
            insightFacade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            insightFacade.addDataset("r1", room, IInsightFacade_1.InsightDatasetKind.Rooms);
            return insightFacade.addDataset("rooms", room, IInsightFacade_1.InsightDatasetKind.Rooms);
        });
        function assertResult(expected, actual) {
            (0, chai_1.expect)(actual).to.deep.equals(expected);
        }
        function assertError(actual, expected) {
            if (expected === "InsightError") {
                (0, chai_1.expect)(actual).to.be.an.instanceOf(IInsightFacade_1.InsightError);
            }
            else if (expected === "ResultTooLargeError") {
                (0, chai_1.expect)(actual).to.be.an.instanceOf(IInsightFacade_1.ResultTooLargeError);
            }
        }
        (0, folder_test_1.folderTest)("Add Dynamic tests", (input) => insightFacade.performQuery(input), "./test/resources/queries", {
            assertOnResult: assertResult,
            assertOnError: assertError,
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map